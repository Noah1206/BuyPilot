#!/usr/bin/env python3
"""
Environment variable checker for Railway deployment
Add this endpoint to test if env vars are properly set
"""
import os

def check_environment():
    """Check critical environment variables"""

    checks = {
        'RAPIDAPI_KEY': os.getenv('RAPIDAPI_KEY'),
        'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY'),
        'DATABASE_URL': os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL'),
        'FLASK_ENV': os.getenv('FLASK_ENV', 'production')
    }

    print("=" * 60)
    print("Environment Variables Check")
    print("=" * 60)

    for key, value in checks.items():
        if value:
            # Mask sensitive values
            if 'KEY' in key or 'URL' in key:
                masked = f"{value[:10]}...{value[-10:]}" if len(value) > 20 else "***"
                print(f"✅ {key}: {masked}")
            else:
                print(f"✅ {key}: {value}")
        else:
            print(f"❌ {key}: NOT SET")

    print("=" * 60)

    # Check if all critical vars are set
    critical = ['RAPIDAPI_KEY', 'DATABASE_URL']
    missing = [k for k in critical if not checks.get(k)]

    if missing:
        print(f"\n⚠️ Missing critical variables: {', '.join(missing)}")
        return False
    else:
        print("\n✅ All critical variables are set")
        return True

if __name__ == '__main__':
    check_environment()
