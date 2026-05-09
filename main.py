"""Network Scanner Main Entry Point"""
import os
import sys
import io
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Fix encoding issues on Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # Force UTF-8 for stdout/stderr
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import webbrowser
from threading import Thread
import time

# Set up paths
app_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(app_dir)
sys.path.insert(0, app_dir)

from app.web_ui import create_app

def start_browser():
    """Open browser after a short delay to ensure server is running"""
    time.sleep(2)
    webbrowser.open('http://localhost:5000')

def main():
    """Main entry point"""
    app = create_app()
    app.logger.setLevel(logging.DEBUG)

    print("Network Scanner starting on http://localhost:5000")
    # Note: Auto-opening browser disabled due to environment issues
    # Open manually at http://localhost:5000

    try:
        from waitress import serve
        serve(app, host='localhost', port=5000)
    except ImportError:
        print("Waitress not available, using Flask development server")
        app.run(host='localhost', port=5000, debug=False)

if __name__ == '__main__':
    main()
