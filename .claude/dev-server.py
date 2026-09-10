"""Local dev server that emulates Cloudflare Pages routing.

- Clean URLs: /brands → serves brands.html
- Reads _redirects file and applies 301 redirects
- Serves static files with correct MIME types
- Falls back to /index.html only for the root path (no SPA fallback)
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re
import os

ROOT = Path(__file__).parent.parent.resolve()
PORT = 8788

# Load _redirects file (Cloudflare Pages format)
REDIRECTS = []
redirects_file = ROOT / "_redirects"
if redirects_file.exists():
    for line in redirects_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = re.split(r"\s+", line)
        if len(parts) >= 2:
            from_path = parts[0]
            to_path = parts[1]
            status = int(parts[2]) if len(parts) >= 3 else 302
            REDIRECTS.append((from_path, to_path, status))
    print(f"Loaded {len(REDIRECTS)} redirects")

class PagesHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/")
        if path == "":
            path = "/"

        # Check redirects (exact match)
        for from_path, to_path, status in REDIRECTS:
            if from_path.rstrip("/") == path:
                self.send_response(status)
                self.send_header("Location", to_path)
                self.end_headers()
                return

        # Clean URL: /brands → /brands.html
        if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            html_path = ROOT / (path.lstrip("/") + ".html")
            if html_path.is_file():
                self.path = path + ".html"

        super().do_GET()

    def end_headers(self):
        # Prevent aggressive caching during local dev
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        # Cleaner log output
        try:
            print(f"  {self.command} {self.path} -> {args[1] if len(args) > 1 else '?'}")
        except Exception:
            pass


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://localhost:{PORT}")
    print("Press Ctrl+C to stop\n")
    HTTPServer(("127.0.0.1", PORT), PagesHandler).serve_forever()
