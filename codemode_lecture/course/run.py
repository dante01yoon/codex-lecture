"""Run a lesson with your signed-in Codex CLI. No personal config changes."""
import subprocess,sys,pathlib
R=pathlib.Path(__file__).resolve().parents[1]
ids={"research":"01_research","reviews":"02_reviews","weekly":"03_weekly","github":"04_github"}
key=ids.get(sys.argv[1] if len(sys.argv)>1 else "","")
if not key:raise SystemExit("Usage: python3 course/run.py research|reviews|weekly|github")
raise SystemExit(subprocess.call([sys.executable,str(R/"production/run_demos.py"),key],cwd=R))
