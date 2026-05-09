#!/usr/bin/env python3
"""Simple HTTP server for serving NetScanner UI"""
import http.server
import socketserver
import os
import sys
from threading import Thread
import time
import webbrowser

PORT = 3000

class UIHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve index.html for root
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def log_message(self, format, *args):
        # Suppress logging
        pass

def start_ui_server():
    """Start the UI web server"""
    os.chdir(os.path.join(os.path.dirname(__file__), 'static'))

    with socketserver.TCPServer(("", PORT), UIHandler) as httpd:
        print(f"UI Server running on http://localhost:{PORT}")
        httpd.serve_forever()

def start_browser():
    """Open browser after delay"""
    time.sleep(2)
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == '__main__':
    # Start browser in background
    browser_thread = Thread(target=start_browser, daemon=True)
    browser_thread.start()

    # Start server
    start_ui_server()
