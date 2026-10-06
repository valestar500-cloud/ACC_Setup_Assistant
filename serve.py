"""Server statico locale senza cache, per lavorare su stile e animazioni.

Uso:  python serve.py [porta]      (su Windows:  py serve.py [porta])
Poi apri http://localhost:8000  (o la porta scelta).

Come `python -m http.server`, ma dice al browser di non tenere copie di file,
così ogni ricarico (F5) mostra sempre l'ultima versione di HTML, CSS, JS e JSON.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with ThreadingHTTPServer(('', port), NoCacheHandler) as httpd:
        print(f'Server senza cache su http://localhost:{port}  (Ctrl+C per fermarlo)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nFermato.')
