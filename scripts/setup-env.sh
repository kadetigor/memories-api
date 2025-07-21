#!/bin/bash

echo "Setting up Memories environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "⚠️  .env file already exists"
fi

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "Creating .env.development file..."
    cp .env.example .env.development
    echo "✅ Created .env.development file"
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env.development with your local settings"
echo "2. Set up PostgreSQL and Redis locally"
echo "3. Create an AWS S3 bucket for development"
echo "4. Get Stripe test keys from https://dashboard.stripe.com/test/apikeys"
echo ""
echo "Run 'npm run start:dev' when ready!"