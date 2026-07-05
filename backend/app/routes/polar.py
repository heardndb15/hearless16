import hashlib
import hmac
import time
import base64
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel

from app.config import (
    POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET,
    POLAR_BASIC_PRODUCT_ID,
    POLAR_PRO_PRODUCT_ID,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/polar", tags=["polar"])

POLAR_API = "https://api.polar.sh"


def _verify_webhook_signature(body: bytes, headers: dict) -> bool:
    msg_id = headers.get("webhook-id", "")
    msg_ts = headers.get("webhook-timestamp", "")
    msg_sig = headers.get("webhook-signature", "")

    # Without this, an unset POLAR_WEBHOOK_SECRET ("") HMACs the payload with
    # an empty key that anyone can reproduce, so a forged webhook would pass
    # verification and could grant a free "pro" upgrade.
    if not POLAR_WEBHOOK_SECRET:
        return False

    if not msg_id or not msg_ts or not msg_sig:
        return False

    try:
        ts = int(msg_ts)
        if abs(time.time() - ts) > 300:
            return False
    except (ValueError, TypeError):
        return False

    signed = f"{msg_id}.{msg_ts}.{body.decode('utf-8')}"
    raw_secret = POLAR_WEBHOOK_SECRET.removeprefix("whsec_")
    try:
        secret_bytes = base64.b64decode(raw_secret)
    except Exception:
        secret_bytes = raw_secret.encode()

    digest = base64.b64encode(
        hmac.new(secret_bytes, signed.encode(), hashlib.sha256).digest()
    ).decode()
    expected = f"v1,{digest}"

    for sig in msg_sig.split(" "):
        if hmac.compare_digest(sig.strip(), expected):
            return True
    return False


@router.post("/webhook")
async def polar_webhook(request: Request):
    body = await request.body()

    if not _verify_webhook_signature(body, dict(request.headers)):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    import json
    event = json.loads(body)
    event_type = event.get("type", "")
    data = event.get("data", {})

    user_id = (data.get("metadata") or {}).get("user_id")
    if not user_id:
        return {"ok": True, "skipped": "no user_id in metadata"}

    db = get_supabase()

    if event_type in ("subscription.created", "subscription.updated", "subscription.active"):
        product_id = data.get("product_id", "")
        if product_id == POLAR_BASIC_PRODUCT_ID:
            plan = "basic"
        elif product_id == POLAR_PRO_PRODUCT_ID:
            plan = "pro"
        else:
            return {"ok": True, "skipped": f"unknown product_id: {product_id}"}

        ends_at = data.get("current_period_end") or data.get("ends_at")
        customer_id = data.get("customer_id", "")

        db.table("users").update({
            "plan": plan,
            "plan_expires_at": ends_at,
            "polar_customer_id": customer_id,
        }).eq("id", user_id).execute()

    elif event_type in ("subscription.canceled", "subscription.revoked"):
        db.table("users").update({
            "plan": "free",
            "plan_expires_at": None,
        }).eq("id", user_id).execute()

    return {"ok": True}


class CheckoutRequest(BaseModel):
    plan: str  # "basic" | "pro"


@router.post("/checkout")
async def create_checkout(
    data: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    if data.plan == "basic":
        product_id = POLAR_BASIC_PRODUCT_ID
    elif data.plan == "pro":
        product_id = POLAR_PRO_PRODUCT_ID
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if not POLAR_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="Polar not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{POLAR_API}/v1/checkouts/custom",
            headers={
                "Authorization": f"Bearer {POLAR_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "product_id": product_id,
                "metadata": {"user_id": current_user["id"]},
                "success_url": "hearless://payment-success",
            },
            timeout=15.0,
        )

    if resp.status_code != 201:
        raise HTTPException(status_code=502, detail=f"Polar error: {resp.text[:200]}")

    url = resp.json().get("url")
    if not url:
        raise HTTPException(status_code=502, detail="Polar returned no checkout URL")

    return {"url": url}
