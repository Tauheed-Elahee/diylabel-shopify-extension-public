# 🚨 Shop Domain Hardcoded - Future Generalization Required

## Current Issue

The shop domain is **hardcoded** in the checkout extensions due to Shopify's sandboxed environment limitations.

### Affected Files:
- `diy-label/extensions/diy-label/src/local-delivery.tsx`
- `diy-label/extensions/diy-label/src/local-pick-up.tsx`

### Current Hardcoded Value:
```typescript
const shopDomain = 'diy-label.myshopify.com';
```

## Why This Was Necessary

Shopify checkout extensions run in a **sandboxed environment** where:
- ❌ `window` object is not available
- ❌ `window.location` cannot be accessed
- ❌ `navigator` object is limited
- ❌ Direct DOM access is restricted

This prevents us from dynamically detecting the shop domain using traditional web APIs.

## Impact

### ✅ **Works For:**
- Single store installations (diy-label.myshopify.com)
- Development and testing
- MVP/proof of concept

### ❌ **Breaks For:**
- Multi-store installations
- Different shop domains
- Production apps serving multiple merchants

## Future Generalization Solutions

### Option 1: Use Shopify's Query API (Recommended)
```typescript
import { useApi } from "@shopify/ui-extensions-react/checkout";

function Extension() {
  const { query } = useApi();
  
  const getShopDomain = async () => {
    const result = await query(`
      query {
        shop {
          myshopifyDomain
        }
      }
    `);
    return result.data?.shop?.myshopifyDomain;
  };
}
```

### Option 2: Pass via Cart Attributes
Set the shop domain in cart attributes from your main app:

```typescript
// In main app when DIY Label is enabled
await fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attributes: {
      'diy_label_shop_domain': shop.permanent_domain,
      // ... other attributes
    }
  })
});

// In checkout extension
const shopDomain = attributes.find(attr => attr.key === 'diy_label_shop_domain')?.value || 'diy-label.myshopify.com';
```

### Option 3: Extension Configuration
Configure shop domain in the extension settings via Shopify admin:

```toml
# In shopify.extension.toml
[extensions.settings]
[[extensions.settings.fields]]
key = "shop_domain"
type = "text"
name = "Shop Domain"
description = "Your shop's myshopify.com domain"
```

### Option 4: Environment Variables (Limited)
Use build-time environment variables (requires rebuild per shop):

```typescript
const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || 'diy-label.myshopify.com';
```

## Recommended Implementation Plan

### Phase 1: Immediate Fix (Current)
- ✅ Use hardcoded domain for MVP
- ✅ Document the limitation
- ✅ Test with single store

### Phase 2: Dynamic Detection (Next Sprint)
- 🔄 Implement Option 1 (Shopify Query API)
- 🔄 Add fallback to hardcoded value
- 🔄 Test with multiple stores

### Phase 3: Production Ready (Future)
- 🔄 Add extension configuration options
- 🔄 Implement proper error handling
- 🔄 Add shop domain validation

## Code Locations to Update

When implementing dynamic shop domain detection, update these locations:

### 1. Local Delivery Extension
**File:** `diy-label/extensions/diy-label/src/local-delivery.tsx`
**Line:** ~150
```typescript
// FIXME: Hardcoded shop domain - needs generalization
const shopDomain = 'diy-label.myshopify.com';
```

### 2. Local Pickup Extension
**File:** `diy-label/extensions/diy-label/src/local-pick-up.tsx`
**Line:** ~150
```typescript
// FIXME: Hardcoded shop domain - needs generalization
const shopDomain = 'diy-label.myshopify.com';
```

## Testing Checklist

When implementing dynamic shop domain:

- [ ] Test with original shop (diy-label.myshopify.com)
- [ ] Test with different shop domain
- [ ] Test fallback behavior when detection fails
- [ ] Verify orders are created with correct shop domain
- [ ] Check Supabase database for proper store association

## Related Issues

- Checkout extensions sandbox limitations
- Multi-tenant app support
- Store-specific configuration
- Order attribution accuracy

## Priority

**Medium Priority** - Required before production release to multiple stores.

---

**Last Updated:** January 2025  
**Status:** Temporary workaround in place  
**Next Action:** Implement dynamic shop domain detection using Shopify Query API