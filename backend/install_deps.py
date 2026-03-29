#!/usr/bin/env python3
import subprocess
import sys

def install_requirements():
    """Install requirements with proper error handling."""
    try:
        print("Installing backend dependencies...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True, timeout=300)

        if result.returncode == 0:
            print("✅ Dependencies installed successfully!")
            return True
        else:
            print("❌ Installation failed:")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False

    except subprocess.TimeoutExpired:
        print("❌ Installation timed out")
        return False
    except Exception as e:
        print(f"❌ Installation error: {e}")
        return False

if __name__ == "__main__":
    success = install_requirements()
    sys.exit(0 if success else 1)