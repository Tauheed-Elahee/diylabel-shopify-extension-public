# DIY Label – Shopify Extension

A Shopify extension that connects stores to local print shops for sustainable merch fulfillment.

All code is in the `diy-label` folder.

This embedded app template uses App Bridge interface examples like an additional page in the app nav, as well as an Admin GraphQL mutation demo, to provide a starting point for app development.

## 🚀 Features

- **Admin Dashboard**: Manage DIY Label settings for products
- **Customer Widget**: Interactive map showing nearby print shops
- **Local Printing**: Connect customers with local print shops
- **Sustainable Options**: Support for reused apparel printing
- **Shopify Integration**: Seamless OAuth and product management

## 🛠️ Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd diy-label-shopify-extension/diy-label/
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Start Development
```bash
# Use Shopify app
shopify app dev

# Start both frontend and backend
npm run dev

# Or start separately:
npm run server  # Backend on port 3001
npm run client  # Frontend on port 3000
```

## 📋 Configuration Guide

### Required Services

1. **Shopify Partners Account** - [Setup Guide](./SHOPIFY_SETUP.md)
2. **Supabase Project** - Database and authentication
3. **Mapbox Account** - Maps and location services
4. **ngrok** - Local development tunneling

### Environment Variables

Your `.env` file should contain:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_client_id_from_partners_dashboard
SHOPIFY_API_SECRET=your_client_secret_from_partners_dashboard
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders
APP_BASE_URL=https://your-app.ngrok.io

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your_mapbox_access_token

# Server Configuration
PORT=3001
NODE_ENV=development
```

## 🏗️ Architecture

### Frontend (`/src`)
- **React + TypeScript** - Modern UI framework
- **Shopify Polaris** - Shopify's design system
- **Mapbox GL JS** - Interactive maps
- **Vite** - Fast development and building

### Backend (`/server`)
- **Express.js** - Web server framework
- **Shopify OAuth** - Secure app authentication
- **Supabase Client** - Database operations
- **RESTful APIs** - Clean API design

### Database (`/supabase`)
- **PostgreSQL** - Robust relational database
- **Row Level Security** - Fine-grained permissions
- **Real-time subscriptions** - Live data updates

## 📱 Usage

### Admin Dashboard (`/admin`)
Manage your DIY Label integration:
- ✅ Enable/disable DIY Label per product
- ✅ Configure reused apparel options
- ✅ View partner print shops
- ✅ Monitor order fulfillment

### Customer Widget (`/widget`)
Embedded on product pages:
- 🗺️ Interactive map of nearby print shops
- 📍 Automatic location detection
- ♻️ Reused apparel options
- 📦 Pickup location selection

## 🗃️ Database Schema

### Core Tables
- `print_shops` - Partner locations and capabilities
- `shopify_stores` - Connected store credentials
- `orders` - DIY Label order tracking
- `products` - Product-specific settings

### Key Features
- **Row Level Security** - Secure multi-tenant data
- **Geographic Queries** - Location-based shop finding
- **Order Tracking** - Full fulfillment lifecycle
- **Store Isolation** - Each store's data is separate

## 🔧 API Endpoints

### Authentication
- `GET /api/auth` - Initiate Shopify OAuth
- `GET /api/auth/callback` - Handle OAuth callback

### Print Shops
- `GET /api/print-shops/nearby` - Find nearby shops
  - Query params: `lat`, `lng`, `radius`

### Orders
- `POST /api/orders/diy-label` - Process DIY Label order
  - Body: `{ productId, printShopId, options }`

### Webhooks
- `POST /api/webhooks/shopify` - Shopify webhook handler

## 🚀 Deployment

### Development
1. Use ngrok for local tunneling
2. Update Shopify app URLs with ngrok URL
3. Test on Shopify development stores

### Production
1. Deploy to your hosting platform
2. Update Shopify app with production URLs
3. Configure environment variables
4. Set up SSL certificates

### Recommended Platforms
- **Vercel** - Easy deployment with GitHub integration
- **Railway** - Simple Node.js hosting
- **DigitalOcean App Platform** - Scalable container hosting
- **Heroku** - Traditional PaaS option

## 🔒 Security

### Best Practices
- ✅ Environment variables for all secrets
- ✅ HTTPS only in production
- ✅ Webhook signature verification
- ✅ Row Level Security in database
- ✅ CSRF protection with state parameter

### Never Commit
- ❌ `.env` files
- ❌ API keys or secrets
- ❌ Access tokens
- ❌ Private keys

## 🆘 Troubleshooting

### Common Issues

**OAuth Redirect Error**
```bash
# Ensure URLs match exactly in Shopify Partners Dashboard
APP_BASE_URL=https://abc123.ngrok.io
# Redirect URL: https://abc123.ngrok.io/api/auth/callback
```

**Database Connection Failed**
```bash
# Check Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Map Not Loading**
```bash
# Verify Mapbox token
VITE_MAPBOX_TOKEN=pk.eyJ1IjoidXNlcm5hbWUi...
```

### Debug Mode
```bash
NODE_ENV=development npm run dev
# Check browser console and server logs
```

## 📚 Documentation

- [Shopify Setup Guide](./SHOPIFY_SETUP.md) - Complete Shopify configuration
- [Shopify App Development](https://shopify.dev/docs/apps) - Official docs
- [Supabase Documentation](https://supabase.com/docs) - Database and auth
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) - Maps integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📧 Support

- **Email**: hello@diylabel.com
- **Issues**: GitHub Issues
- **Documentation**: This README and linked guides

## 📄 License

MIT License - see LICENSE file for details.

## Information

Information about the project can be found here: [https://diylabel.netlify.app/](https://diylabel.netlify.app/)

---

**Built with ❤️ for sustainable local commerce**
