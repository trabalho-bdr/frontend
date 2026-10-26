from dotenv import load_dotenv
from pathlib import Path
import sys

p = Path(__file__).resolve().parent
load_dotenv(p / ".env")
sys.path.insert(0, str(p))
import uvicorn

uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
