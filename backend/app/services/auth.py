import hashlib
import hmac
import os
import secrets
import sqlite3
import time

from fastapi import Header, HTTPException


DB_PATH = os.getenv(
    "AUTH_DB_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "auth.db")),
)
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 120_000


def _get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    with _get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )


def _hash_password(password, salt_hex):
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        PBKDF2_ITERATIONS,
    )
    return digest.hex()


def _normalize_email(email):
    return (email or "").strip().lower()


def create_user(email, password):
    email = _normalize_email(email)
    if not email or not password:
        raise ValueError("Email and password are required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)
    created_at = int(time.time())

    with _get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO users (email, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
                (email, password_hash, salt, created_at),
            )
        except sqlite3.IntegrityError as exc:
            raise ValueError("Email already registered.") from exc

        user_id = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()["id"]

    return {"id": user_id, "email": email}


def authenticate_user(email, password):
    email = _normalize_email(email)
    if not email or not password:
        return None

    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            return None

        expected = _hash_password(password, row["salt"])
        if not hmac.compare_digest(expected, row["password_hash"]):
            return None

        return {"id": row["id"], "email": row["email"]}


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    expires_at = now + SESSION_TTL_SECONDS

    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires_at),
        )

    return token


def revoke_session(token):
    if not token:
        return
    with _get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def get_user_by_token(token):
    if not token:
        return None
    now = int(time.time())
    with _get_conn() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.email, sessions.expires_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()

        if not row:
            return None
        if row["expires_at"] < now:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return None

        return {"id": row["id"], "email": row["email"]}


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authentication.")

    token = authorization.replace("Bearer ", "", 1).strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    return user
