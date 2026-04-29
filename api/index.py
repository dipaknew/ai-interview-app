"""
Vercel serverless entry point for the FastAPI backend.
Mangum wraps the ASGI app and strips the /api prefix before handing
requests to FastAPI's own routes (e.g. /api/auth/login → /auth/login).
"""
import sys
import os

# Make sure the repo root is on the path so 'backend' is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app  # noqa: E402
from mangum import Mangum  # noqa: E402

# api_gateway_base_path strips the "/api" prefix that vercel.json rewrites inject
handler = Mangum(app, api_gateway_base_path="/api", lifespan="off")
