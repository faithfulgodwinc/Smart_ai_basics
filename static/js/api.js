// One small function per server route. Each sends JSON and turns server errors into
// a friendly message, plus the name of the field it belongs to.

export class ApiError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach Smart's server. Is it running?");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // A 404/405 with no message means the running server is older than this page:
    // it doesn't have this route yet. Restarting it loads the new code.
    const outdated = !data.error && [404, 405].includes(response.status);
    throw new ApiError(
      data.error || (outdated
        ? "Smart's server is running an older version. Restart it (Ctrl+C, then python app.py) and try again."
        : "Something went wrong. Try again."),
      data.field,
    );
  }
  return data;
}

export const getState = () => request("GET", "/api/state");
export const saveSettings = (settings) => request("PUT", "/api/settings", settings);
export const saveCard = (card) => request("POST", "/api/cards", card);
export const saveSubscription = (sub) => request("POST", "/api/subscriptions", sub);
export const cancelSubscription = (id) => request("POST", `/api/subscriptions/${id}/cancel`);
export const renewSubscription = (id, deadline) => request("POST", `/api/subscriptions/${id}/renew`, { deadline });
export const updateSubscription = (id, sub) => request("PUT", `/api/subscriptions/${id}`, sub);
export const updateCard = (id, card) => request("PUT", `/api/cards/${id}`, card);
export const getInbox = () => request("GET", "/api/inbox");
