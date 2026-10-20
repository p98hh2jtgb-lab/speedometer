"""Dependency-free preview server, bound for Arena's browser proxy."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            self.path = '/preview/index.html'
        elif path.startswith('/ui/modules/apps/ApexSpeedometer/'):
            self.path = '/mod' + self.path
        elif not path.startswith(('/preview/', '/mod/ui/', '/downloads/')):
            self.send_error(404)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

if __name__ == '__main__':
    print('APEX preview: http://0.0.0.0:8080', flush=True)
    ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
