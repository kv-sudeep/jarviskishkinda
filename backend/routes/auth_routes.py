"""
auth_routes.py — JARVIS Flask Blueprint
REST API endpoints for authentication and first-time setup.
"""
import logging
import os
import threading
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from security.auth import (
    is_setup_complete,
    setup_credentials,
    set_voice_sample_path,
    verify_hardware_fingerprint,
    verify_pin,
    get_failed_attempts,
    reset_failed_attempts,
    MAX_ATTEMPTS,
)
from security.voice import enroll_voice, verify_voice
from security.intruder import activate_intruder_protocol

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VOICE_SAMPLES_DIR  = os.getenv("VOICE_SAMPLES_DIR",  "./data/voice_samples")
SNAPSHOTS_DIR      = os.getenv("INTRUDER_SNAPSHOTS_DIR", "./data/intruder_snapshots")
INCIDENT_LOG       = os.getenv("INCIDENT_LOG", "./data/incidents.log")


# ─── Health ───────────────────────────────────────────────────────────────────

@auth_bp.get("/status")
def status():
    """Quick health/status check — returns setup state."""
    return jsonify({
        "jarvis": "online",
        "setup_complete": is_setup_complete(),
        "failed_attempts": get_failed_attempts(),
        "max_attempts": MAX_ATTEMPTS,
    })


# ─── Setup ────────────────────────────────────────────────────────────────────

@auth_bp.post("/setup")
def setup():
    """
    First-time setup endpoint.
    Body: { "pin": "1234" }

    Step 1 of 2: Records hardware fingerprint + hashed PIN.
    After this call, POST /api/auth/setup/voice to record voice sample.
    """
    data = request.get_json(silent=True) or {}
    pin  = data.get("pin", "").strip()

    if not pin or len(pin) < 4:
        return jsonify({"error": "PIN must be at least 4 characters."}), 400

    try:
        result = setup_credentials(pin)
        return jsonify({
            "message": "Step 1 complete. Hardware fingerprint recorded and PIN hashed.",
            "fingerprint_preview": result["fingerprint"][:16] + "...",
        }), 200
    except Exception as e:
        logger.error("Setup error: %s", e)
        return jsonify({"error": str(e)}), 500


@auth_bp.post("/setup/voice")
def setup_voice():
    """
    Step 2 of setup: Record the owner's voice sample.
    No body required. JARVIS will capture audio from the default microphone for 4 seconds.
    """
    try:
        npy_path = enroll_voice(VOICE_SAMPLES_DIR)
        set_voice_sample_path(npy_path)
        return jsonify({
            "message": "Voice sample enrolled successfully. Setup complete.",
            "voice_sample": os.path.basename(npy_path),
        }), 200
    except Exception as e:
        logger.error("Voice enrollment error: %s", e)
        return jsonify({"error": str(e)}), 500


# ─── Login ────────────────────────────────────────────────────────────────────

@auth_bp.post("/login")
def login():
    """
    Full authentication login.
    Body: { "pin": "1234" }

    Performs:
      1. Hardware fingerprint check (machine validation).
      2. PIN verification (SHA-256 hashed with hardware salt).
      3. Voice verification (MFCC cosine similarity >= 0.95).
      4. Returns JWT token (4-hour expiry) on success.
      5. On 3rd failure — triggers Intruder Protocol.
    """
    if not is_setup_complete():
        return jsonify({"error": "JARVIS not configured. Run setup first."}), 400

    # ── 1. Hardware Check ──
    if not verify_hardware_fingerprint():
        return jsonify({
            "error": "HARDWARE MISMATCH. This is not the authorized machine.",
            "code": "HARDWARE_MISMATCH",
        }), 403

    data = request.get_json(silent=True) or {}
    pin  = data.get("pin", "").strip()

    if not pin:
        return jsonify({"error": "PIN is required."}), 400

    # ── 2. PIN Verification ──
    try:
        pin_ok = verify_pin(pin)
    except RuntimeError as lockdown_exc:
        # 3 failed attempts — trigger intruder protocol in background
        client_ip = request.remote_addr or "unknown"
        _trigger_intruder_protocol(details=f"IP={client_ip}")
        return jsonify({
            "error": "LOCKDOWN INITIATED. Intruder protocol activated.",
            "code": "INTRUDER_LOCKDOWN",
        }), 403

    if not pin_ok:
        remaining = MAX_ATTEMPTS - get_failed_attempts()
        return jsonify({
            "error": "Incorrect PIN.",
            "remaining_attempts": remaining,
        }), 401

    # ── 3. Voice Verification ──
    from security.auth import _load_config
    config          = _load_config()
    voice_ref_path  = config.get("voice_sample_path")

    if not voice_ref_path:
        return jsonify({"error": "No voice sample enrolled. Run /api/auth/setup/voice."}), 400

    voice_match, score = verify_voice(voice_ref_path)
    if not voice_match:
        return jsonify({
            "error": "Voice fingerprint mismatch.",
            "similarity": round(score, 4),
            "threshold": 0.95,
        }), 401

    # ── 4. Issue JWT Token ──
    reset_failed_attempts()
    token = create_access_token(identity="owner")

    logger.info("Login successful — JWT issued (score=%.4f)", score)
    return jsonify({
        "message": "JARVIS online. Welcome, sir.",
        "token": token,
        "voice_similarity": round(score, 4),
    }), 200


# ─── Protected Example ────────────────────────────────────────────────────────

@auth_bp.get("/me")
@jwt_required()
def me():
    """Protected route — verifies JWT is valid."""
    identity = get_jwt_identity()
    return jsonify({"identity": identity, "status": "authorized"}), 200


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _trigger_intruder_protocol(details: str) -> None:
    """Fire intruder protocol in a daemon thread so the HTTP response isn't blocked."""
    t = threading.Thread(
        target=activate_intruder_protocol,
        args=(SNAPSHOTS_DIR, INCIDENT_LOG, details),
        daemon=True,
    )
    t.start()
