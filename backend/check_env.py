#!/usr/bin/env python3
"""
Check environment variables on EC2
"""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv('/home/ec2-user/BuyPilot/backend/.env')

print("🔍 Checking Environment Variables")
print("=" * 60)

# Check all NAVER related variables
naver_vars = {
    'NAVER_CLIENT_ID': os.getenv('NAVER_CLIENT_ID'),
    'NAVER_CLIENT_SECRET': os.getenv('NAVER_CLIENT_SECRET'),
    'NAVER_COMMERCE_CLIENT_ID': os.getenv('NAVER_COMMERCE_CLIENT_ID'),
    'NAVER_COMMERCE_CLIENT_SECRET': os.getenv('NAVER_COMMERCE_CLIENT_SECRET'),
    'NAVER_SELLER_ID': os.getenv('NAVER_SELLER_ID'),
    'NAVER_TALK_PARTNER_ID': os.getenv('NAVER_TALK_PARTNER_ID'),
    'NAVER_TALK_AUTHORIZATION': os.getenv('NAVER_TALK_AUTHORIZATION'),
}

print("\n📋 Naver Related Variables:")
for key, value in naver_vars.items():
    if value:
        # Mask sensitive values
        if len(value) > 10:
            masked = value[:5] + "..." + value[-3:]
        else:
            masked = value[:3] + "..."
        print(f"✅ {key:35} = {masked}")
    else:
        print(f"❌ {key:35} = NOT SET")

# Check database
print("\n📋 Database:")
db_url = os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')
if db_url:
    print(f"✅ Database configured")
else:
    print(f"❌ Database NOT configured")

print("\n" + "=" * 60)

# Show .env file location
print(f"\n📁 .env file location: /home/ec2-user/BuyPilot/backend/.env")
print(f"   File exists: {os.path.exists('/home/ec2-user/BuyPilot/backend/.env')}")

# Show all environment variables starting with NAVER
print("\n🌍 All NAVER* environment variables from os.environ:")
for key, value in os.environ.items():
    if 'NAVER' in key:
        masked = value[:5] + "..." + value[-3:] if len(value) > 10 else value[:3] + "..."
        print(f"   {key} = {masked}")
