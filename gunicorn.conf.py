"""Settings for running Smart on a server (Render) with gunicorn, a production web server.

One worker on purpose: the reminder watcher must run exactly once, or reminders could
be checked twice. Threads let that one worker serve several visitors at the same time.
"""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
workers = 1
threads = 8
timeout = 60


def post_worker_init(worker):
    # The worker has loaded app.py; start the every-minute reminder watcher inside it.
    import reminders
    from app import app

    reminders.start_watcher(app)
