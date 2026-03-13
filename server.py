import http.server
import socketserver
import os

PORT = 8000

# 切换到 public 目录
os.chdir('public')

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()
