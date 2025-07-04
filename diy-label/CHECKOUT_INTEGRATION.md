# 🛒 Shopify Checkout Integration Guide

Complete guide for integrating DIY Label with Shopify's checkout process.

## 🎯 Integration Strategies

### 1. **Cart Attributes Method** (Recommended - Easiest)
Add DIY Label selection as cart attributes that persist through checkout.

### 2. **Checkout Extensions** (Most Powerful)
Use Shopify's new checkout extensibility for native integration.

### 3. **Order Webhooks** (Post-Purchase)
Process DIY Label orders after checkout completion.

### 4. **Script Tag Integration** (Legacy)
Inject JavaScript into the checkout process.

---

## 🚀 Strategy 1: Cart Attributes (Recommended)

### How It Works
1. Customer selects print shop on product page
2. Selection is stored as cart attributes
3. Attributes persist through checkout
4. Process DIY Label order after payment

### Implementation

#### Step 1: Update Widget to Set Cart Attributes

```javascript
// In your widget's selectPrintShop function
async function selectPrintShop(printShop) {
  try {
    // Store selection in cart attributes
    const cartData = {
      attributes: {
        'diy_label_enabled': 'true',
        'diy_label_print_shop_id': printShop.id,
        'diy_label_print_shop_name': printShop.name,
        'diy_label_print_shop_address': printShop.address,
        'diy_label_customer_location': JSON.stringify(userLocation)
      }
    };

    // Update Shopify cart
    const response = await fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartData)
    });

    if (response.ok) {
      // Show success message
      showSuccessMessage(`Print shop selected: ${printShop.name}`);
      closeModal();
    }
  } catch (error) {
    console.error('Error updating cart:', error);
  }
}
```

#### Step 2: Display Selection in Cart/Checkout

Add to your theme's `cart.liquid` or `cart-drawer.liquid`:

```liquid
{% comment %} DIY Label Selection Display {% endcomment %}
{% if cart.attributes.diy_label_enabled == 'true' %}
<div class="diy-label-selection">
  <h4>🌱 Local Printing Selected</h4>
  <p><strong>Print Shop:</strong> {{ cart.attributes.diy_label_print_shop_name }}</p>
  <p><strong>Location:</strong> {{ cart.attributes.diy_label_print_shop_address }}</p>
  <p class="diy-label-note">Your order will be printed locally to reduce shipping impact!</p>
</div>
{% endif %}
```

#### Step 3: Process Orders via Webhook

Update your `orders/paid` webhook:

```typescript
// In app/routes/webhooks.orders.paid.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  
  try {
    const order = payload as any;
    
    // Check if this is a DIY Label order
    if (order.note_attributes) {
      const diyLabelEnabled = order.note_attributes.find(
        attr => attr.name === 'diy_label_enabled' && attr.value === 'true'
      );
      
      if (diyLabelEnabled) {
        // Extract DIY Label data
        const printShopId = order.note_attributes.find(
          attr => attr.name === 'diy_label_print_shop_id'
        )?.value;
        
        const printShopName = order.note_attributes.find(
          attr => attr.name === 'diy_label_print_shop_name'
        )?.value;
        
        // Create DIY Label order
        await createDIYLabelOrder({
          shopifyOrderId: order.id.toString(),
          shopDomain: shop,
          printShopId: parseInt(printShopId),
          productData: {
            line_items: order.line_items,
            total: order.total_price
          },
          customerData: {
            name: `${order.customer.first_name} ${order.customer.last_name}`,
            email: order.customer.email,
            phone: order.customer.phone,
            address: order.shipping_address
          }
        });
        
        console.log(`DIY Label order created for Shopify order ${order.id}`);
      }
    }
  } catch (error) {
    console.error('Error processing DIY Label order:', error);
  }
  
  return new Response();
};
```

---

## 🔧 Strategy 2: Checkout Extensions (Advanced)

### Create Checkout Extension

```bash
cd diy-label
shopify app generate extension
# Choose: Checkout UI extension
```

### Extension Code

```typescript
// extensions/diy-label-checkout/src/Checkout.tsx
import {
  reactExtension,
  useCartLines,
  useApplyAttributeChange,
  Banner,
  BlockStack,
  Button,
  Text,
  InlineLayout
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <DIYLabelCheckout />
);

function DIYLabelCheckout() {
  const cartLines = useCartLines();
  const applyAttributeChange = useApplyAttributeChange();
  
  // Check if any products have DIY Label enabled
  const hasDIYLabelProducts = cartLines.some(line => 
    line.merchandise.product.tags.includes('diy-label')
  );
  
  if (!hasDIYLabelProducts) {
    return null;
  }
  
  const handleSelectPrintShop = async () => {
    // Open DIY Label modal or redirect to selection page
    const result = await applyAttributeChange({
      type: 'updateAttribute',
      key: 'diy_label_selection_needed',
      value: 'true'
    });
  };
  
  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Local Printing Available</Text>
          <Text>
            Support your local community and reduce shipping impact by 
            printing your items at a nearby shop.
          </Text>
        </BlockStack>
      </Banner>
      
      <Button onPress={handleSelectPrintShop}>
        Choose Local Print Shop
      </Button>
    </BlockStack>
  );
}
```

---

## 📦 Strategy 3: Order Processing Webhook

### Enhanced Webhook Handler

```typescript
// app/routes/webhooks.orders.paid.tsx
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  
  try {
    const order = payload as any;
    
    // Check each line item for DIY Label products
    for (const lineItem of order.line_items) {
      const productId = lineItem.product_id?.toString();
      if (!productId) continue;
      
      // Check if this product has DIY Label enabled
      const { data: store } = await supabaseAdmin
        .from('shopify_stores')
        .select('id')
        .eq('shop_domain', shop)
        .single();
      
      if (!store) continue;
      
      const { data: productSettings } = await supabaseAdmin
        .from('product_settings')
        .select('*')
        .eq('shopify_store_id', store.id)
        .eq('shopify_product_id', productId)
        .single();
      
      if (productSettings?.diy_label_enabled) {
        // This product needs DIY Label processing
        await handleDIYLabelProduct(order, lineItem, store.id);
      }
    }
  } catch (error) {
    console.error('Error processing order webhook:', error);
  }
  
  return new Response();
};

async function handleDIYLabelProduct(order: any, lineItem: any, storeId: string) {
  // Option 1: Auto-assign to closest print shop
  const customerLocation = extractLocationFromOrder(order);
  if (customerLocation) {
    const { data: nearbyShops } = await supabaseAdmin
      .rpc('get_nearby_print_shops', {
        user_lat: customerLocation.lat,
        user_lng: customerLocation.lng,
        radius_km: 50
      });
    
    if (nearbyShops && nearbyShops.length > 0) {
      // Auto-assign to closest shop
      await createDIYLabelOrder({
        shopifyOrderId: order.id.toString(),
        shopDomain: order.shop_domain,
        printShopId: nearbyShops[0].id,
        productData: lineItem,
        customerData: extractCustomerData(order)
      });
    }
  }
  
  // Option 2: Send email to customer for print shop selection
  await sendPrintShopSelectionEmail(order, lineItem);
}
```

---

## 🎨 Strategy 4: Theme Integration

### Product Page Integration

Add to your product template:

```liquid
{% comment %} DIY Label Widget {% endcomment %}
{% if product.tags contains 'diy-label' %}
<div class="diy-label-product-section">
  <h3>🌱 Local Printing Option</h3>
  <p>Print this item locally to support your community and reduce shipping impact.</p>
  
  <button id="diy-label-select-btn" class="btn btn-secondary">
    Choose Local Print Shop
  </button>
  
  <div id="diy-label-selection" style="display: none;">
    <p>✅ <span id="selected-shop-name"></span> selected for local printing</p>
  </div>
</div>

<script>
document.getElementById('diy-label-select-btn').addEventListener('click', function() {
  // Open DIY Label widget in modal
  const modal = document.createElement('iframe');
  modal.src = '{{ app_url }}/widget?shop={{ shop.permanent_domain }}&product={{ product.id }}';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; border: none; z-index: 9999;';
  document.body.appendChild(modal);
  
  // Listen for print shop selection
  window.addEventListener('message', function(event) {
    if (event.data.type === 'diy-label-selection') {
      const printShop = event.data.printShop;
      
      // Update cart with DIY Label attributes
      fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            'diy_label_enabled': 'true',
            'diy_label_print_shop_id': printShop.id,
            'diy_label_print_shop_name': printShop.name
          }
        })
      }).then(() => {
        // Show selection
        document.getElementById('selected-shop-name').textContent = printShop.name;
        document.getElementById('diy-label-selection').style.display = 'block';
        document.getElementById('diy-label-select-btn').style.display = 'none';
        
        // Close modal
        document.body.removeChild(modal);
      });
    }
  });
});
</script>
{% endif %}
```

---

## 🔄 Complete Integration Flow

### 1. Customer Journey
```
Product Page → Select Print Shop → Add to Cart → Checkout → Payment → Order Processing
     ↓              ↓              ↓           ↓          ↓            ↓
   Widget      Cart Attributes   Display    Process   Webhook    Create DIY Order
```

### 2. Data Flow
```javascript
// Product page selection
{
  printShopId: 123,
  printShopName: "Local Print Co",
  customerLocation: { lat: 37.7749, lng: -122.4194 }
}
     ↓
// Cart attributes
{
  "diy_label_enabled": "true",
  "diy_label_print_shop_id": "123",
  "diy_label_print_shop_name": "Local Print Co"
}
     ↓
// Order webhook
{
  shopifyOrderId: "4567890",
  printShopId: 123,
  productData: { ... },
  customerData: { ... }
}
```

---

## 🛠️ Implementation Checklist

### Phase 1: Basic Integration
- [ ] Update widget to set cart attributes
- [ ] Display DIY Label selection in cart
- [ ] Process orders via webhook
- [ ] Test with development store

### Phase 2: Enhanced UX
- [ ] Add checkout extension
- [ ] Implement customer email notifications
- [ ] Add order tracking
- [ ] Create admin dashboard for print shops

### Phase 3: Advanced Features
- [ ] Auto-assignment based on location
- [ ] Print shop capacity management
- [ ] Real-time order updates
- [ ] Customer preference storage

---

## 🧪 Testing Your Integration

### Test Cart Attributes
```javascript
// In browser console on product page
fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attributes: {
      'diy_label_enabled': 'true',
      'diy_label_print_shop_id': '1',
      'diy_label_print_shop_name': 'Test Shop'
    }
  })
}).then(r => r.json()).then(console.log);
```

### Test Webhook Processing
```bash
# Trigger test webhook
curl -X POST https://your-app.com/webhooks/orders/paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/paid" \
  -d '{"id": 12345, "note_attributes": [{"name": "diy_label_enabled", "value": "true"}]}'
```

---

## 🚨 Important Considerations

### Security
- ✅ Validate all webhook signatures
- ✅ Sanitize cart attribute data
- ✅ Use HTTPS for all communications
- ✅ Implement rate limiting

### Performance
- ✅ Cache print shop data
- ✅ Optimize database queries
- ✅ Use background jobs for order processing
- ✅ Implement proper error handling

### User Experience
- ✅ Clear visual feedback for selections
- ✅ Graceful fallbacks if DIY Label fails
- ✅ Mobile-responsive design
- ✅ Accessibility compliance

---

## 📞 Next Steps

1. **Choose your integration strategy** (Cart Attributes recommended for MVP)
2. **Update your widget** to set cart attributes
3. **Modify your theme** to display DIY Label selections
4. **Enhance your webhook** to process DIY Label orders
5. **Test thoroughly** with development stores
6. **Deploy and monitor** for issues

The Cart Attributes method is the most reliable and easiest to implement, while Checkout Extensions provide the most native experience but require more development effort.