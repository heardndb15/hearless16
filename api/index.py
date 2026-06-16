import sys
from pathlib import Path

# Add the backend directory to the Python path so imports work on Vercel
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.main import app

# Vercel expects the ASGI app to be named 'app' at the module level
# FastAPI is already an ASGI app, so this is all we need
