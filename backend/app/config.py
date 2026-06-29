import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

POLAR_ACCESS_TOKEN = os.getenv("POLAR_ACCESS_TOKEN", "")
POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET", "")
POLAR_BASIC_PRODUCT_ID = os.getenv("POLAR_BASIC_PRODUCT_ID", "")
POLAR_PRO_PRODUCT_ID = os.getenv("POLAR_PRO_PRODUCT_ID", "")
