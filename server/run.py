from pathlib import Path
import os
import sys

p=Path(__file__).resolve().parent
local_python=p.parent/'venv'/'Scripts'/'python.exe'
if local_python.is_file() and Path(sys.executable).resolve()!=local_python.resolve():
    os.execv(str(local_python),[str(local_python),str(Path(__file__).resolve()),*sys.argv[1:]])

from dotenv import load_dotenv
load_dotenv(p/'.env')
sys.path.insert(0,str(p))
import uvicorn
uvicorn.run('app:app',host='127.0.0.1',port=8000,reload=False)
