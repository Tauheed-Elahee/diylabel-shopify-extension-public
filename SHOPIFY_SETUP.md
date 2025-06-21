# 🛍️ Shopify App Setup Guide

Complete guide for setting up your DIY Label Shopify app in the Partners Dashboard.

## 📋 Prerequisites

- Shopify Partners account
- ngrok installed for local development
- This project running locally

## 🚀 Step-by-Step Setup

### 1. Create Shopify Partners Account
- Go to [partners.shopify.com](https://partners.shopify.com)
- Sign up or log in to your account

### 2. Create New App
1. Click **"Apps"** in the main navigation
2. Click **"Create app"**
3. Choose **"Public app"** (for distribution) or **"Custom app"** (for specific stores)
4. Fill in app details:
   - **App name**: `DIY Label`
   - **App URL**: `https://your-app.ngrok.io` (we'll update this)
   - **Allowed redirection URL(s)**: `https://your-app.ngrok.io/api/auth/callback`

### 3. Configure App Settings

#### Basic Information
- **App name**: DIY Label
- **Description**: Connect your Shopify store to local print shops for sustainable merch fulfillment
- **Developer**: Your name/company
- **Contact email**: Your email

#### App URLs
- **App URL**: `https://your-app.ngrok.io`
- **Allowed redirection URL(s)**: 
  ```
  https://your-app.ngrok.io/api/auth/callback
  ```

#### Scopes (Permissions)
Select these permissions for your app:
- ✅ `read_products` - Read product information
- ✅ `write_products` - Modify product information  
- ✅ `read_orders` - Read order information
- ✅ `write_orders` - Modify order information

### 4. Get Your Credentials

After creating the app, you'll see:
- **Client ID** → This is your `SHOPIFY_API_KEY`
- **Client secret** → This is your `SHOPIFY_API_SECRET`

### 5. Update Environment Variables

Copy your credentials to your `.env` file:

```bash
# Replace with your actual values from Shopify Partners Dashboard
SHOPIFY_API_KEY=c30d129ec75fc4671b304acd3271cd02
SHOPIFY_API_SECRET=f74ce4841a01ebc5976b2ff4d01232e1
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders
APP_BASE_URL=https://your-app.ngrok.io
```

### 6. Set Up ngrok for Local Development

1. **Install ngrok** (if not already installed):
   ```bash
   # macOS
   brew install ngrok
   
   # Windows
   choco install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your local server**:
   ```bash
   npm run dev
   ```

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 3001
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update your environment**:
   ```bash
   APP_BASE_URL=https://abc123.ngrok.io
   ```

6. **Update Shopify app settings**:
   - Go back to your app in Partners Dashboard
   - Update **App URL** to: `https://abc123.ngrok.io`
   - Update **Allowed redirection URL(s)** to: `https://abc123.ngrok.io/api/auth/callback`

### 7. Test the Installation

1. **Install on a development store**:
   - In Partners Dashboard, go to your app
   - Click **"Test on development store"**
   - Select or create a development store
   - Click **"Install app"**

2. **Verify OAuth flow**:
   - You should be redirected to your app
   - Check that the OAuth callback works
   - Verify you can access the admin dashboard

## 🔧 Configuration Summary

Your final configuration should look like:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=c30d129ec75fc4671b304acd3271cd02
SHOPIFY_API_SECRET=f74ce4841a01ebc5976b2ff4d01232e1
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders
APP_BASE_URL=https://abc123.ngrok.io

# Supabase Configuration  
VITE_SUPABASE_URL=https://guptqrjjfqlrsvgczvqd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mapbox Configuration
VITE_MAPBOX_TOKEN=pk.eyJ1IjoidGF1aGVlZC1lbGFoZWUiLCJhIjoiY21jMTVuMng4...

# Server Configuration
PORT=3001
NODE_ENV=development
```

## 🚨 Important Notes

### Security
- ⚠️ **Never commit your `.env` file** to version control
- ⚠️ **Keep your Client secret secure** - it has admin access to stores
- ⚠️ **Use HTTPS URLs only** for production

### Development vs Production
- **Development**: Use ngrok URLs for testing
- **Production**: Use your actual domain (e.g., `https://diylabel.com`)

### Scopes
- Only request the permissions you actually need
- Users will see these permissions during installation
- You can add more scopes later, but users will need to re-authorize

## 🔗 Useful Links

- [Shopify Partners Dashboard](https://partners.shopify.com)
- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [App Scopes Reference](https://shopify.dev/docs/api/usage/access-scopes)

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure your redirect URL in Shopify matches exactly: `https://your-app.ngrok.io/api/auth/callback`
   - Check that ngrok is running and the URL is correct

2. **"App installation failed"**
   - Verify your `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
   - Check that your server is running on the correct port

3. **"Scope mismatch"**
   - Ensure `SHOPIFY_SCOPES` in your `.env` matches what you configured in Partners Dashboard

4. **ngrok tunnel expired**
   - Restart ngrok to get a new URL
   - Update both your `.env` file and Shopify app settings with the new URL

Need help? Check the server logs for detailed error messages.
