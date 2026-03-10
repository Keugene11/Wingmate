#!/usr/bin/env bash
# Generates an Android signing keystore and outputs the base64-encoded version
# for use as a GitHub secret.
#
# Usage: bash scripts/setup-android-signing.sh
#
# After running, add these GitHub secrets:
#   KEYSTORE_BASE64    — the base64 output
#   KEYSTORE_PASSWORD  — the password you enter
#   KEY_PASSWORD       — the key password you enter
#   KEY_ALIAS          — "wingmate" (or whatever you choose)

set -e

KEYSTORE_FILE="wingmate-release.jks"
KEY_ALIAS="wingmate"

echo "=== Android Signing Key Generator ==="
echo ""

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists: $KEYSTORE_FILE"
  echo "Delete it first if you want to regenerate."
  exit 1
fi

read -sp "Enter keystore password (min 6 chars): " STORE_PASS
echo ""
read -sp "Enter key password (min 6 chars): " KEY_PASS
echo ""

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias "$KEY_ALIAS" \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=Wingmate, O=Wingmate, L=Unknown, ST=Unknown, C=US"

echo ""
echo "=== Keystore created: $KEYSTORE_FILE ==="
echo ""
echo "Base64-encoded keystore (copy this as KEYSTORE_BASE64 secret):"
echo "---"
base64 -w 0 "$KEYSTORE_FILE" 2>/dev/null || base64 "$KEYSTORE_FILE" | tr -d '\n'
echo ""
echo "---"
echo ""
echo "Now add these GitHub secrets (Settings → Secrets and variables → Actions):"
echo ""
echo "  KEYSTORE_BASE64     = (the base64 string above)"
echo "  KEYSTORE_PASSWORD   = (the store password you entered)"
echo "  KEY_PASSWORD         = (the key password you entered)"
echo "  KEY_ALIAS            = $KEY_ALIAS"
echo ""
echo "And these GitHub variables:"
echo ""
echo "  APP_HOST             = your-app.vercel.app"
echo "  ANDROID_PACKAGE_ID   = com.wingmate.twa"
echo ""
echo "Optional (for auto-publish to Play Store):"
echo "  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = (service account JSON from Google Play Console)"
echo ""
echo "⚠️  Keep $KEYSTORE_FILE safe — you need the SAME key for all future updates!"
echo "⚠️  Do NOT commit $KEYSTORE_FILE to git."
