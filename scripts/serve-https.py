"""LAN-only static preview. TLS material is never served from the document root."""
import argparse
import functools
import ssl
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

parser = argparse.ArgumentParser()
parser.add_argument('--bind', required=True)
parser.add_argument('--port', type=int, default=4189)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root / 'dist'))
server = ThreadingHTTPServer((args.bind, args.port), handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(root / '.local-tls/server.crt', root / '.local-tls/server.key')
server.socket = context.wrap_socket(server.socket, server_side=True)
print(f'Winostalgy local: https://{args.bind}:{args.port}/', flush=True)
server.serve_forever()
