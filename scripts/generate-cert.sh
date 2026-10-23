#!/bin/bash

# Generate self-signed HTTPS certificate for local development
# This is required for phone camera access (secure context)

echo "🔐 Generating self-signed HTTPS certificate..."

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out certs/key.pem 2048

# Generate certificate
echo "📝 Generating certificate..."
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=CrowdSafe AI/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.1.1,IP:192.168.0.1"

echo ""
echo "✅ Certificate generated successfully!"
echo ""
echo "📁 Files created:"
echo "   - certs/key.pem (private key)"
echo "   - certs/cert.pem (certificate)"
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
echo "🔧 Note: You may need to update the IP addresses in the certificate"
echo "   to match your laptop's local IP address."
echo "   Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)"
echo ""
echo "🚀 Next steps:"
echo "   1. npm run dev (starts HTTPS server on port 3000)"
echo "   2. npm run signaling (starts WebSocket server on port 3001)"
echo "   3. Open https://YOUR_LAPTOP_IP:3000 on your phone"
echo ""
