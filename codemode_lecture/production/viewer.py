from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import json,subprocess,threading
R=Path(__file__).resolve().parents[1]
state={'running':False,'lesson':None,'exit':None}
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(R),**kw)
 def do_GET(self):
  if self.path=='/api/status':
   b=json.dumps(state).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b);return
  if self.path=='/':self.path='/production/viewer.html'
  return super().do_GET()
 def do_POST(self):
  if self.path!='/api/run':self.send_error(404);return
  q=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))));key=q.get('lesson')
  if key not in ['01_research','02_reviews','03_weekly','04_github'] or state['running']:self.send_error(409);return
  import shutil,time
  archive=R/'qa'/('before-recording-'+str(int(time.time())));archive.mkdir()
  for f in list((R/'assets').glob(key+'.*'))+list((R/'qa').glob(key+'.*')):shutil.copy2(f,archive/f.name)
  state.update(running=True,lesson=key,exit=None)
  def work():
   p=subprocess.run(['python3',str(R/'production/run_demos.py'),key],cwd=R,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   state.update(running=False,exit=p.returncode)
  threading.Thread(target=work,daemon=True).start()
  self.send_response(200);self.end_headers();self.wfile.write(b'{}')
 def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',8769),H).serve_forever()
