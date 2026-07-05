#!/usr/bin/env python3
"""
Instagram SaaS Scheduler Daemon
-------------------------------
A separate background service that continuously polls a PostgreSQL database via Prisma-aligned tables,
identifies pending scheduled posts whose publishing time has arrived, uploads them using the 
official Instagram Graph API, logs execution, and implements exponential backoff retries.

Never requests or stores user passwords. Uses secure OAuth Access Tokens.
"""

import os
import sys
import time
import json
import logging
import math
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timezone
from cryptography.fernet import Fernet

# Configure professional logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scheduler.log")
    ]
)
logger = logging.getLogger("InstagramScheduler")

# Environment and Credentials Setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/instasched")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "") # Fernet key to decrypt stored Instagram access tokens
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30")) # Check every 30 seconds
MAX_RETRIES = 5
BASE_BACKOFF = 2.0  # Base backoff in seconds

# Initialize Decryption Cipher if key exists
cipher = None
if ENCRYPTION_KEY:
    try:
        cipher = Fernet(ENCRYPTION_KEY.encode())
        logger.info("Fernet decryption module initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Fernet decryption. Access tokens may fail to decrypt: {e}")


def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts a secure stored access token."""
    if not cipher:
        # If no key is set, assume plaintext in sandbox / local environment
        return encrypted_token
    try:
        return cipher.decrypt(encrypted_token.encode()).decode()
    except Exception as e:
        logger.error(f"Decryption failed for access token: {e}")
        raise e


def create_publish_log(conn, post_id: str, status: str, message: str, attempt: int = 1, payload: str = None):
    """Inserts a secure audit trail log into PostgreSQL (PublishLog table)."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "PublishLog" (id, "scheduledPostId", timestamp, status, message, "attemptCount", "responsePayload")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    f"log_{os.urandom(4).hex()}",
                    post_id,
                    datetime.now(timezone.utc),
                    status,
                    message,
                    attempt,
                    payload
                )
            )
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to write publish log: {e}")


def update_post_status(conn, post_id: str, status: str, posted_at=None, instagram_id=None, error=None):
    """Updates the ScheduledPost record status and errors in the database."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "ScheduledPost"
                SET status = %s, "postedAt" = %s, "instagramId" = %s, error = %s, "updatedAt" = %s
                WHERE id = %s
                """,
                (status, posted_at, instagram_id, error, datetime.now(timezone.utc), post_id)
            )
        conn.commit()
        logger.info(f"Post {post_id} updated to status: {status}")
    except Exception as e:
        logger.error(f"Failed to update post status for ID {post_id}: {e}")


def make_graph_api_request(method: str, url: str, params: dict, attempt: int = 1) -> dict:
    """
    Executes an API request to the Instagram Graph API,
    wrapping it with Exponential Backoff for transient HTTP errors.
    """
    for run in range(1, attempt + 1):
        try:
            logger.info(f"Connecting to Instagram Graph Endpoint (Attempt {run}/{attempt})...")
            if method.upper() == "POST":
                response = requests.post(url, json=params, timeout=30)
            else:
                response = requests.get(url, params=params, timeout=30)
            
            # Handle standard Instagram API Rate Limits, Service Unavailable, or Gateway timeouts
            if response.status_code in [429, 500, 502, 503, 504]:
                backoff = BASE_BACKOFF * math.pow(2, run)
                logger.warning(f"Transient Graph API error {response.status_code}. Backing off for {backoff:.1f}s...")
                time.sleep(backoff)
                continue
            
            return response.json()
        except requests.RequestException as err:
            if run == attempt:
                raise err
            backoff = BASE_BACKOFF * math.pow(2, run)
            logger.warning(f"Network exception: {err}. Retrying in {backoff:.1f}s...")
            time.sleep(backoff)


def publish_to_instagram(conn, post: dict, account: dict) -> bool:
    """
    Executes publishing via the official Instagram Graph API.
    Uses the 2-step Container creation and publication flow:
    1. Create Media Container: POST graph.facebook.com/v20.0/{instagram_account_id}/media
    2. Publish Media Container: POST graph.facebook.com/v20.0/{instagram_account_id}/media_publish
    """
    post_id = post["id"]
    post_type = post["type"]
    caption = post["caption"]
    media_urls = post["mediaUrls"]
    ig_user_id = account["id"] # The Instagram Business Account ID
    
    # Decrypt the access token
    try:
        access_token = decrypt_token(account["accessToken"])
    except Exception:
        error_msg = "Decryption Failure: Stored secure OAuth token is corrupted or key mismatch."
        create_publish_log(conn, post_id, "error", error_msg)
        update_post_status(conn, post_id, "failed", error=error_msg)
        return False

    api_base = "https://graph.facebook.com/v20.0"

    try:
        create_publish_log(conn, post_id, "info", f"Initiating official Graph API flow for {post_type.upper()} creation.")
        container_ids = []

        # STEP 1: CREATE CONTAINER(S)
        if post_type == "photo":
            params = {
                "image_url": media_urls[0],
                "caption": caption,
                "access_token": access_token
            }
            res = make_graph_api_request("POST", f"{api_base}/{ig_user_id}/media", params, attempt=MAX_RETRIES)
            
            if "error" in res:
                raise Exception(f"Container Creation Error: {res['error'].get('message', 'Unknown api issue')}")
            
            container_ids.append(res["id"])
            create_publish_log(conn, post_id, "success", f"Single photo media container successfully initialized (ID: {res['id']}).", payload=json.dumps(res))

        elif post_type == "reel":
            # Reels require a media_type: REELS flag and vertical video structure
            params = {
                "media_type": "REELS",
                "video_url": media_urls[0],
                "caption": caption,
                "access_token": access_token
            }
            res = make_graph_api_request("POST", f"{api_base}/{ig_user_id}/media", params, attempt=MAX_RETRIES)
            
            if "error" in res:
                raise Exception(f"Reels Container Error: {res['error'].get('message', 'Unknown reels issue')}")
            
            container_id = res["id"]
            container_ids.append(container_id)
            create_publish_log(conn, post_id, "info", f"Reel video container generated (ID: {container_id}). Monitoring upload processing status...", payload=json.dumps(res))

            # Video uploads need processing time. Poll container status until ready
            # Official status check endpoint: GET graph.facebook.com/v20.0/{container_id}
            for status_attempt in range(12): # Poll for up to 2 minutes
                time.sleep(10)
                status_res = make_graph_api_request("GET", f"{api_base}/{container_id}", {"fields": "status_code", "access_token": access_token})
                status_code = status_res.get("status_code", "EXPIRED")
                
                if status_code == "FINISHED":
                    create_publish_log(conn, post_id, "success", "Reel video resource processing completed on Instagram edge.")
                    break
                elif status_code == "ERROR":
                    raise Exception("Video conversion failed on Instagram servers.")
                else:
                    logger.info(f"Reel conversion state: {status_code}. Polling again...")
            else:
                raise Exception("Timed out waiting for Instagram to process vertical video container.")

        elif post_type == "carousel":
            # Carousel albums require first uploading child containers, then compiling them in a parent container
            child_container_ids = []
            create_publish_log(conn, post_id, "info", f"Uploading {len(media_urls)} items into distinct child nodes...")
            
            for idx, item_url in enumerate(media_urls):
                params = {
                    "image_url": item_url,
                    "is_carousel_item": True,
                    "access_token": access_token
                }
                child_res = make_graph_api_request("POST", f"{api_base}/{ig_user_id}/media", params, attempt=MAX_RETRIES)
                if "error" in child_res:
                    raise Exception(f"Failed to upload slide item {idx+1}: {child_res['error'].get('message')}")
                child_container_ids.append(child_res["id"])
                create_publish_log(conn, post_id, "info", f"Uploaded slide #{idx+1} container (ID: {child_res['id']}).")
            
            # Now create parent container compiling children
            parent_params = {
                "media_type": "CAROUSEL",
                "children": child_container_ids,
                "caption": caption,
                "access_token": access_token
            }
            res = make_graph_api_request("POST", f"{api_base}/{ig_user_id}/media", parent_params, attempt=MAX_RETRIES)
            if "error" in res:
                raise Exception(f"Carousel Compilation Failure: {res['error'].get('message')}")
            
            container_ids.append(res["id"])
            create_publish_log(conn, post_id, "success", f"Carousel parent container successfully constructed (ID: {res['id']}).", payload=json.dumps(res))

        # STEP 2: PUBLISH CONTAINER
        target_container = container_ids[0]
        publish_params = {
            "creation_id": target_container,
            "access_token": access_token
        }
        
        create_publish_log(conn, post_id, "info", f"Executing release handshake for Container ID: {target_container}")
        pub_res = make_graph_api_request("POST", f"{api_base}/{ig_user_id}/media_publish", publish_params, attempt=MAX_RETRIES)

        if "error" in pub_res:
            raise Exception(f"Publish Release Error: {pub_res['error'].get('message', 'No permission to release container')}")

        instagram_post_id = pub_res["id"]
        create_publish_log(
            conn, 
            post_id, 
            "success", 
            f"Successfully published live on feed! Official Instagram Media ID: {instagram_post_id}",
            payload=json.dumps(pub_res)
        )
        
        # Mark as completed
        update_post_status(conn, post_id, "completed", posted_at=datetime.now(timezone.utc), instagram_id=instagram_post_id)
        return True

    except Exception as e:
        error_msg = f"Instagram Publish Pipeline Failed: {str(e)}"
        logger.error(f"[Post ID: {post_id}] {error_msg}")
        create_publish_log(conn, post_id, "error", error_msg)
        update_post_status(conn, post_id, "failed", error=error_msg)
        return False


def poll_and_process():
    """Polls PostgreSQL for pending posts whose scheduled timing has arrived."""
    conn = None
    try:
        conn = get_db_connection()
        now = datetime.now(timezone.utc)
        
        with conn.cursor() as cur:
            # Query posts ready for release
            cur.execute(
                """
                SELECT * FROM "ScheduledPost"
                WHERE status = 'pending' AND "scheduledFor" <= %s
                ORDER BY "scheduledFor" ASC
                """,
                (now,)
            )
            due_posts = cur.fetchall()

        if not due_posts:
            return

        logger.info(f"Discovered {len(due_posts)} scheduled posts ready for publication.")

        for post in due_posts:
            post_id = post["id"]
            account_id = post["instagramAccountId"]

            # Securely set status to publishing (acting as an advisory lock)
            update_post_status(conn, post_id, "publishing")

            with conn.cursor() as cur:
                # Retrieve connected Instagram Account credentials securely
                cur.execute(
                    'SELECT * FROM "InstagramAccount" WHERE id = %s AND "isConnected" = TRUE', 
                    (account_id,)
                )
                account = cur.fetchone()

            if not account:
                error_msg = "Publishing Blocked: The connected Instagram Account has been unlinked or is no longer connected."
                create_publish_log(conn, post_id, "error", error_msg)
                update_post_status(conn, post_id, "failed", error=error_msg)
                continue

            # Execute publish pipeline
            publish_to_instagram(conn, post, account)

    except Exception as e:
        logger.error(f"Error in scheduler execution tick: {e}")
    finally:
        if conn:
            conn.close()


def main():
    logger.info("==============================================")
    logger.info("   INSTASCHED SEPARATE PYTHON SERVICE DAEMON  ")
    logger.info("==============================================")
    logger.info("Active thread polling started. Ticking database queue...")

    try:
        while True:
            poll_and_process()
            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Service stopping cleanly by administrative signals.")
    except Exception as err:
        logger.fatal(f"Scheduler service crashed: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
