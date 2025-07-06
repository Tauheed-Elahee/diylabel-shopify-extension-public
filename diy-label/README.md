# DIY Label – Shopify Extension

A simplified Shopify extension that connects stores to local print shops for sustainable merch fulfillment.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd diy-label
npm install
```

### 2. Environment Setup
Create `.env` file with:
```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_client_id_from_partners_dashboard
SHOPIFY_API_SECRET=your_client_secret_from_partners_dashboard
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders
SHOPIFY_APP_URL=https://your-app-url.com

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your_mapbox_access_token
```

### 3. Start Development
```bash
shopify app dev
```

## 📱 Features

- **Admin Dashboard**: Enable/disable DIY Label per product
- **Customer Widget**: Interactive map showing nearby print shops
- **Theme Extension**: Easy integration into any Shopify theme

## 🏗️ Architecture

### Core Files
- `app/routes/app._index.tsx` - Admin dashboard
- `app/routes/widget.tsx` - Customer-facing widget
- `app/routes/api.*.tsx` - API endpoints
- `extensions/diy-label/` - Theme extension
- `supabase/migrations/` - Database schema

### Database Tables
- `print_shops` - Partner locations and capabilities
- `shopify_stores` - Connected store credentials
- `diy_label_orders` - Order tracking
- `product_settings` - Product-specific settings

## 🔧 API Endpoints

- `GET /api/print-shops/nearby` - Find nearby shops
- `POST /api/orders/diy-label` - Process DIY Label order
- `GET /api/product-settings` - Check product settings

## 🚀 Deployment

1. Deploy to your hosting platform
2. Update Shopify app with production URLs
3. Configure environment variables

## 📄 License

MIT License