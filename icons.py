"""Finds a subscription site's own icon (Netflix's red N, say), so lists show something recognisable.

How it works, step by step:
  1. Take the site from the cancel link: https://www.netflix.com/cancelplan -> netflix.com
  2. Already have it (or tried recently)? Use that. Each site is fetched once, for everyone.
  3. Otherwise read the site's home page and pick its best icon: apple-touch-icon first (large and
     made for home screens), then the biggest "icon", then /favicon.ico.
  4. Keep it as a data: URI, so the app shows it without the browser contacting the site.

It asks the site itself, never a third-party favicon service: that service would learn which
services each person pays for. And because it fetches addresses people type in, it is careful:
only public http(s) addresses (never this server or its network, even after a redirect), short
timeouts, small responses, and only files that really are images.
"""

import base64
import http.client
import ipaddress
import socket
import threading
import time
import urllib.request
from datetime import datetime, timedelta
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import db

TIME_BUDGET = 9          # seconds for the whole search (it runs while the rest of the form is filled in)
TIMEOUT = 6              # seconds for any one request
MAX_PAGE = 600_000       # bytes of home page to read
MAX_IMAGE = 200_000      # bytes for an icon
RETRY_AFTER = timedelta(days=7)  # a site with no usable icon is asked again after a week
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; SmartIcons/1.0; +https://smart-pf9k.onrender.com)",
           "Accept": "text/html,image/*;q=0.9,*/*;q=0.5"}


def ensure_icon(sub):
    """Makes sure this subscription's site icon is cached. Never raises: no icon just means a monogram."""
    domain = db.icon_domain(sub)
    if not domain:
        return
    cached = db.get_icon(domain)
    if cached and (cached["data_uri"] or
                   datetime.now().astimezone() - datetime.fromisoformat(cached["fetched_at"]) < RETRY_AFTER):
        return
    try:
        data_uri = find_icon(domain)
    except Exception as error:  # a slow, odd or unreachable site must never stop a save
        print(f"[icons] {domain}: {error}")
        data_uri = None
    db.save_icon(domain, data_uri or "")


def ensure_icon_soon(sub):
    """Like ensure_icon, but in the background: saving a subscription never waits for a website."""
    domain = db.icon_domain(sub)
    cached = domain and db.get_icon(domain)
    if domain and not (cached and cached["data_uri"]):
        threading.Thread(target=ensure_icon, args=(dict(sub),), daemon=True).start()


def find_icon(domain):
    deadline = time.monotonic() + TIME_BUDGET
    for home in (f"https://{domain}/", f"https://www.{domain}/"):
        links = IconLinks()
        page = fetch(home, MAX_PAGE, deadline, links)
        if not page:
            continue
        final_url = page[2]
        candidates = [urljoin(final_url, href) for *_, href in sorted(links.found)]
        candidates.append(urljoin(final_url, "/favicon.ico"))
        for url in candidates:
            if time.monotonic() > deadline:
                return None
            image = fetch(url, MAX_IMAGE, deadline)
            mime = image and image_type(image[0])
            if mime:
                return f"data:{mime};base64,{base64.b64encode(image[0]).decode()}"
        return None
    return None


class IconLinks(HTMLParser):
    """Collects icon tags, best first: (rank, -size, href). Reads <link rel="apple-touch-icon"/"icon">,
    and <meta name="apple-touch-icon" content> (which some sites, like Netflix, use instead)."""

    def __init__(self):
        super().__init__()
        self.found = []
        self.head_over = False

    def has_best(self):
        return self.head_over or any(rank == 0 for rank, *_ in self.found)

    def handle_endtag(self, tag):
        if tag == "head":
            self.head_over = True

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "body":
            self.head_over = True
        if tag == "meta" and (attrs.get("name") or "").lower() == "apple-touch-icon":
            tag, attrs = "link", {"rel": "apple-touch-icon", "href": attrs.get("content")}
        if tag != "link":
            return
        rel = (attrs.get("rel") or "").lower().split()
        href = (attrs.get("href") or "").strip()
        if not href or href.startswith("data:"):
            return
        if "apple-touch-icon" in rel or "apple-touch-icon-precomposed" in rel:
            rank = 0
        elif "icon" in rel:
            rank = 1
        else:
            return
        sizes = [int(part) for size in (attrs.get("sizes") or "").lower().split()
                 for part in size.split("x")[:1] if part.isdigit()]
        self.found.append((rank, -max(sizes, default=0), href))


def image_type(data):
    """The image's real type from its first bytes (the server's Content-Type can't be trusted)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data.startswith(b"\x00\x00\x01\x00"):
        return "image/x-icon"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    head = data[:300].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in head):
        return "image/svg+xml"  # shown with <img>, where an SVG can't run scripts
    return None


# --- Fetching only public addresses -------------------------------------------------

def is_public(host):
    """True if every address the name points to is on the public internet."""
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(host, None)}
    except (socket.gaierror, UnicodeError):
        return False
    return bool(addresses) and all(ipaddress.ip_address(address.split("%")[0]).is_global for address in addresses)


def allowed(url):
    parts = urlsplit(url)
    return parts.scheme in ("http", "https") and bool(parts.hostname) and is_public(parts.hostname)


class CheckRedirects(urllib.request.HTTPRedirectHandler):
    """Follows a redirect only if it also leads somewhere public."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl):
            return None  # urllib then treats the redirect as an error
        return super().redirect_request(req, fp, code, msg, headers, newurl)


opener = urllib.request.build_opener(CheckRedirects)


def fetch(url, limit, deadline, links=None):
    """(body, content type, final url), or None if it isn't allowed, fails, or is too big.
    Given `links`, it reads a page a piece at a time into them, and stops once the best icon is known."""
    remaining = deadline - time.monotonic()
    if remaining <= 0 or not allowed(url):
        return None
    try:
        with opener.open(urllib.request.Request(url, headers=HEADERS), timeout=min(TIMEOUT, remaining)) as response:
            if links is not None:
                read = 0
                while read < limit and not links.has_best() and time.monotonic() < deadline:
                    try:
                        chunk = response.read(16_384)
                    except http.client.IncompleteRead as cut_short:  # some servers close early
                        chunk = cut_short.partial
                    if not chunk:
                        break
                    read += len(chunk)
                    links.feed(chunk.decode("utf-8", "replace"))
                return b"", response.headers.get_content_type(), response.geturl()
            try:
                body = response.read(limit + 1)
            except http.client.IncompleteRead as cut_short:  # what arrived is enough
                body = cut_short.partial
            if len(body) > limit:
                return None
            return body, response.headers.get_content_type(), response.geturl()
    except Exception:
        return None
