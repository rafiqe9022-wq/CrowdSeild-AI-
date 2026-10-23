#!/bin/bash

# Generate self-signed HTTPS certificate for local development
# This is required for phone camera access (secure context)

echo "🔐 Generating self-signed HTTPS certificate..."

# Create certs directory if it doesn't exist
mkdir -p certs

# Auto-detect laptop's IP address
echo "🔍 Detecting your laptop's IP address..."

# Try different methods to get IP based on OS
if command -v ipconfig &> /dev/null && [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    LAPTOP_IP=$(ipconfig | grep -A 1 "Wireless\|Ethernet" | grep "IPv4" | head -1 | awk -F': ' '{print $2}' | tr -d '\r')
elif command -v ifconfig &> /dev/null; then
    # Mac/Linux
    LAPTOP_IP=$(ifconfig | grep -E "inet (addr:)?(192|10|172)" | grep -v "127.0.0.1" | head -1 | awk '{print $2}' | sed 's/addr://')
elif command -v ip &> /dev/null; then
    # Linux alternative
    LAPTOP_IP=$(ip addr show | grep -E "inet (192|10|172)" | grep -v "127.0.0.1" | head -1 | awk '{print $2}' | cut -d'/' -f1)
fi

# Fallback if detection fails
if [ -z "$LAPTOP_IP" ]; then
    echo "⚠️  Could not auto-detect IP address."
    echo "💡 Please enter your laptop's IP address manually:"
    echo "   (Find it with: ipconfig on Windows, or ifconfig on Mac/Linux)"
    read -p "   Enter IP address: " LAPTOP_IP
    
    if [ -z "$LAPTOP_IP" ]; then
        echo "❌ No IP address provided. Using placeholder."
        LAPTOP_IP="192.168.1.100"
    fi
fi

echo "✅ Detected IP: $LAPTOP_IP"
echo ""

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out certs/key.pem 2048

# Generate certificate with detected IP
echo "📝 Generating certificate with IP: $LAPTOP_IP..."
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=CrowdSafe AI/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$LAPTOP_IP"

echo ""
echo "✅ Certificate generated successfully!"
echo ""
echo "📁 Files created:"
echo "   - certs/key.pem (private key)"
echo "   - certs/cert.pem (certificate)"
echo "   - Includes IP: $LAPTOP_IP"
echo ""
echo "⚠️  IMPORTANT: Trust the certificate on your phone!"
echo ""
echo "📱 For iOS:"
echo "   1. AirDrop or email certs/cert.pem to your iPhone"
echo "   2. Open the file and tap 'Install'"
echo "   3. Go to Settings > General > About > Certificate Trust Settings"
echo "   4. Enable full trust for the certificate"
echo ""
echo "📱 For Android:"
echo "   1. Transfer certs/cert.pem to your phone"
echo "   2. Go to Settings > Security > Encryption & Credentials"
echo "   3. Tap 'Install a certificate' > 'CA certificate'"
echo "   4. Select the cert.pem file"
echo ""
echo "🚀 Next steps:"
echo "   1. npm run signaling (starts WebSocket server on port 3001)"
echo "   2. npm run dev (starts HTTPS server on port 3000)"
echo "   3. Open https://$LAPTOP_IP:3000 on your phone"
echo ""
echo "💡 If your IP changes, re-run this script to regenerate the certificate."
echo ""
