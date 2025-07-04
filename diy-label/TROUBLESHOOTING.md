# 🔧 Shopify Authentication Troubleshooting

## Current Issue: Invalid Access Token

**Problem**: HTTP 401 - Invalid API key or access token
**Token Format**: `shpua_` (should be `shpat_` or `shpca_`)
**Status**: Authentication Failed

## 🚀 Step-by-Step Fix

### 1. Complete App Uninstall
1. Go to your Shopify admin: `https://diy-label.myshopify.com/admin`
2. Navigate to **Settings → Apps and sales channels**
3. Find **DIY Label** app
4. Click **Uninstall** and confirm

### 2. Clear Browser Data
1. In your browser, press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select **All time** as the time range
3. Check:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click **Delete data**

### 3. Restart Development Server
```bash
# Stop current server (Ctrl+C)
cd diy-label
shopify app dev
```

### 4. Fresh Installation
1. When the server starts, you'll get a new tunnel URL
2. Click the installation link in the terminal
3. Complete the OAuth flow again
4. Grant all requested permissions

### 5. Verify Fix
Test the debug page again:
```
https://NEW-TUNNEL-URL.trycloudflare.com/debug-shopify-auth?shop=diy-label.myshopify.com
```

## 🎯 What to Expect

After reinstalling, you should see:
- ✅ **Status**: Authentication Working
- ✅ **Token Format**: `shpat_` or `shpca_`
- ✅ **API Test**: HTTP 200 Success
- ✅ **Product API**: Working correctly

## 🔍 Common Issues

### Issue: "App not found"
**Solution**: Check that your app is active in Partners Dashboard

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the tunnel URL matches in `shopify.app.toml`

### Issue: "Scope mismatch"
**Solution**: Verify scopes in Partners Dashboard match your `.env` file

## 📞 Still Having Issues?

If problems persist after following these steps:

1. Check the server logs for detailed error messages
2. Verify your Partners Dashboard app configuration
3. Test with a different development store
4. Contact support with the debug page output

---

**Next Steps**: Follow the reinstall process above, then test the debug page again.