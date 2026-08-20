"""Web Push (VAPID) — send push notifications to registered PWA clients."""
import os
import json
import logging
from pywebpush import webpush, WebPushException

logger = logging.getLogger("dhl.push")

VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@dhl.com")


def public_key() -> str:
    return VAPID_PUBLIC


async def send_push(db, user_id: str, title: str, body: str, url: str = "/"):
    if not VAPID_PRIVATE:
        return
    subs = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(20)
    dead = []
    for s in subs:
        try:
            webpush(
                subscription_info=s["subscription"],
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=VAPID_PRIVATE,
                vapid_claims={"sub": VAPID_SUBJECT},
                ttl=86400,
            )
        except WebPushException as e:
            logger.warning(f"Push failed {user_id}: {e}")
            if e.response is not None and e.response.status_code in (404, 410):
                dead.append(s["endpoint"])
        except Exception as e:
            logger.warning(f"Push error {user_id}: {e}")
    if dead:
        await db.push_subscriptions.delete_many({"endpoint": {"$in": dead}})
