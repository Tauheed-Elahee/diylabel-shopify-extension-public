# DIY Label Netlify Functions

This folder contains Netlify Functions that replicate the API endpoints from your Remix app, allowing you to host these specific endpoints on Netlify separately from your main application.

## 📁 Structure

```
netlify-functions/
├── netlify/
│   └── functions/
│       ├── nearby-shops.js          # GET /api/print-shops/nearby
│       ├── diy-label-order.js       # POST /api/orders/diy-label
│       ├── shopify-order-webhook.js # POST /webhooks/orders/paid
│       └── widget-data.js           # GET /api/widget-data
├── package.json
├── netlify.toml
└── README.md
```

## 🚀 Deployment Steps

### 1. Install Dependencies
```bash
cd netlify-functions
npm install
```

### 2. Set Environment Variables on Netlify

Go to your Netlify site dashboard → **Site settings** → **Environment variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` | Supabase service role key (keep secret!) |
| `VITE_MAPBOX_TOKEN` | `pk.eyJ1...` | Mapbox access token for maps |
| `SHOPIFY_API_SECRET` | `your_shopify_secret` | For webhook signature verification |

### 3. Deploy to Netlify

**Option A: Git Integration (Recommended)**
1. Push this folder to your Git repository
2. Connect the repository to Netlify
3. Set build directory to `netlify-functions`
4. Deploy

**Option B: Manual Upload**
1. Zip the entire `netlify-functions` folder
2. Drag and drop to Netlify dashboard
3. Deploy

### 4. Update Your Checkout Extensions

After deployment, update your checkout extensions to use the new Netlify URLs:

```typescript
// In diy-label/extensions/diy-label/src/local-delivery.tsx
// Replace the apiUrl with your Netlify site URL:

const apiUrl = `https://YOUR_SITE_NAME.netlify.app/.netlify/functions/nearby-shops?lat=${lat}&lng=${lng}&radius=50`;
```

## 📡 Available Endpoints

Once deployed, your functions will be accessible at:

### **Nearby Print Shops**
```
GET https://YOUR_SITE_NAME.netlify.app/.netlify/functions/nearby-shops
```
**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude  
- `radius` (optional): Search radius in km (default: 25)

**Example:**
```
https://YOUR_SITE_NAME.netlify.app/.netlify/functions/nearby-shops?lat=37.7749&lng=-122.4194&radius=25
```

### **Create DIY Label Order**
```
POST https://YOUR_SITE_NAME.netlify.app/.netlify/functions/diy-label-order
```
**Body:**
```json
{
  "shopifyOrderId": "order-123",
  "shopDomain": "store.myshopify.com",
  "printShopId": 1,
  "productData": { "title": "T-Shirt", "total": 25.00 },
  "customerData": { "name": "John Doe", "email": "john@example.com" }
}
```

### **Shopify Order Webhook**
```
POST https://YOUR_SITE_NAME.netlify.app/.netlify/functions/shopify-order-webhook
```
Configure this URL in your Shopify Partners Dashboard for the `orders/paid` webhook.

### **Widget Data**
```
GET https://YOUR_SITE_NAME.netlify.app/.netlify/functions/widget-data
```
**Query Parameters:**
- `shop` (required): Shop domain
- `product` (optional): Product ID
- `lat` (optional): Latitude
- `lng` (optional): Longitude
- `radius` (optional): Search radius

## 🔧 URL Redirects

The `netlify.toml` file includes redirects so you can use cleaner URLs:

- `/api/print-shops/nearby` → `/.netlify/functions/nearby-shops`
- `/api/orders/diy-label` → `/.netlify/functions/diy-label-order`
- `/webhooks/orders/paid` → `/.netlify/functions/shopify-order-webhook`

This means you can use either:
- `https://YOUR_SITE_NAME.netlify.app/.netlify/functions/nearby-shops`
- `https://YOUR_SITE_NAME.netlify.app/api/print-shops/nearby` (cleaner)

## 🔒 Security Notes

1. **Environment Variables**: Never commit your `.env` file. All secrets should be set in Netlify's dashboard.

2. **Webhook Verification**: The `shopify-order-webhook.js` includes HMAC signature verification for security.

3. **CORS**: All functions include proper CORS headers for cross-origin requests.

## 🧪 Testing

### Test Nearby Shops
```bash
curl "https://YOUR_SITE_NAME.netlify.app/.netlify/functions/nearby-shops?lat=37.7749&lng=-122.4194&radius=25"
```

### Test Order Creation
```bash
curl -X POST "https://YOUR_SITE_NAME.netlify.app/.netlify/functions/diy-label-order" \
  -H "Content-Type: application/json" \
  -d '{
    "shopifyOrderId": "test-123",
    "shopDomain": "test-store.myshopify.com",
    "printShopId": 1,
    "productData": {"title": "Test Product", "total": 25.00},
    "customerData": {"name": "Test User", "email": "test@example.com"}
  }'
```

## 🔄 Migration from Remix

If you're migrating from your Remix app, update these files:

1. **Checkout Extensions**: Update API URLs to point to Netlify
2. **Shopify Webhooks**: Update webhook URLs in Partners Dashboard
3. **Widget Code**: Update any hardcoded API URLs

## 📞 Support

- **Netlify Functions Docs**: https://docs.netlify.com/functions/
- **Supabase Docs**: https://supabase.com/docs
- **Shopify Webhooks**: https://shopify.dev/docs/apps/webhooks

---

**Replace `YOUR_SITE_NAME` with your actual Netlify site name throughout this documentation.**