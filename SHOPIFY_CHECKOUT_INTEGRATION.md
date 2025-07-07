# 🛒 Shopify Checkout Integration & Revenue Distribution

Complete guide for integrating DIY Label with Shopify's checkout process and revenue distribution model.

## 🔄 Shopify Checkout Integration

### How App Extensions Work with Checkout

#### **Current Shopify Checkout Architecture**
```
Product Page → Cart → Checkout → Payment → Order Confirmation
     ↓          ↓        ↓         ↓            ↓
DIY Label   Cart Attrs  Checkout   Process    Fulfillment
Selection   Stored     Extension   Payment    to Print Shop
```

### Integration Methods

#### **Method 1: Cart Attributes (Current Implementation)**
```liquid
<!-- Customer selects print shop on product page -->
<script>
// Store selection in cart attributes
fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attributes: {
      'diy_label_enabled': 'true',
      'diy_label_print_shop_id': printShop.id,
      'diy_label_print_shop_name': printShop.name,
      'diy_label_customer_location': JSON.stringify(location)
    }
  })
});
</script>
```

**Pros:**
- ✅ Works with all Shopify themes
- ✅ No checkout modifications needed
- ✅ Persists through entire checkout flow
- ✅ Available in order webhooks

**Cons:**
- ❌ Not visible during checkout process
- ❌ Customer can't change selection in checkout
- ❌ Limited customization options

#### **Method 2: Checkout Extensions (Recommended)**
```typescript
// extensions/checkout-diy-label/src/Checkout.tsx
import {
  reactExtension,
  useCartLines,
  useApplyAttributeChange,
  Banner,
  BlockStack,
  Button,
  Text
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <DIYLabelCheckout />
);

function DIYLabelCheckout() {
  const cartLines = useCartLines();
  const applyAttributeChange = useApplyAttributeChange();
  
  // Check if cart has DIY Label products
  const hasDIYProducts = cartLines.some(line => 
    line.attributes.some(attr => 
      attr.key === 'diy_label_enabled' && attr.value === 'true'
    )
  );
  
  if (!hasDIYProducts) return null;
  
  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Local Printing Selected</Text>
          <Text>
            Your order will be printed locally at [Print Shop Name] 
            to reduce shipping impact and support your community.
          </Text>
        </BlockStack>
      </Banner>
      
      <Button 
        kind="secondary" 
        onPress={() => {
          // Allow customer to change print shop
          window.open('/widget/select-print-shop', '_blank');
        }}
      >
        Change Print Shop
      </Button>
    </BlockStack>
  );
}
```

**Pros:**
- ✅ Native Shopify checkout integration
- ✅ Visible during checkout process
- ✅ Can modify selection in checkout
- ✅ Better user experience
- ✅ Mobile optimized

**Cons:**
- ❌ More complex to implement
- ❌ Requires Shopify Plus for some features
- ❌ Limited to Shopify's UI components

#### **Method 3: Post-Purchase Extensions**
```typescript
// Show DIY Label confirmation after purchase
export default reactExtension(
  'purchase.thank-you.block.render',
  () => <DIYLabelConfirmation />
);

function DIYLabelConfirmation() {
  const order = useOrder();
  
  const diyLabelOrder = order.attributes.find(
    attr => attr.key === 'diy_label_enabled'
  );
  
  if (!diyLabelOrder) return null;
  
  return (
    <BlockStack spacing="base">
      <Banner status="success">
        <Text emphasis="bold">🌱 Your order is going local!</Text>
        <Text>
          Your items will be printed at [Print Shop Name]. 
          You'll receive updates as your order progresses.
        </Text>
      </Banner>
    </BlockStack>
  );
}
```

### Complete Checkout Flow

#### **1. Product Page Selection**
```javascript
// Customer selects print shop on product page
const selectPrintShop = async (printShop) => {
  // Update cart with DIY Label selection
  await fetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributes: {
        'diy_label_enabled': 'true',
        'diy_label_print_shop_id': printShop.id,
        'diy_label_print_shop_name': printShop.name,
        'diy_label_print_shop_address': printShop.address,
        'diy_label_estimated_completion': calculateCompletion(printShop),
        'diy_label_customer_location': JSON.stringify(userLocation)
      }
    })
  });
};
```

#### **2. Cart Display**
```liquid
<!-- In cart.liquid template -->
{% if cart.attributes.diy_label_enabled == 'true' %}
<div class="diy-label-cart-notice">
  <h4>🌱 Local Printing Selected</h4>
  <p><strong>Print Shop:</strong> {{ cart.attributes.diy_label_print_shop_name }}</p>
  <p><strong>Location:</strong> {{ cart.attributes.diy_label_print_shop_address }}</p>
  <p><strong>Estimated Ready:</strong> {{ cart.attributes.diy_label_estimated_completion }}</p>
  <p class="sustainability-note">
    ♻️ This order will be printed locally to reduce shipping impact!
  </p>
</div>
{% endif %}
```

#### **3. Checkout Extension**
```typescript
// Show DIY Label info during checkout
const CheckoutDIYLabel = () => {
  const cart = useCart();
  const diyEnabled = cart.attributes.diy_label_enabled === 'true';
  
  if (!diyEnabled) return null;
  
  return (
    <Banner status="info">
      <BlockStack>
        <Text emphasis="bold">🌱 Local Printing</Text>
        <Text>
          Printing at: {cart.attributes.diy_label_print_shop_name}
        </Text>
        <Text size="small">
          Ready for pickup: {cart.attributes.diy_label_estimated_completion}
        </Text>
      </BlockStack>
    </Banner>
  );
};
```

#### **4. Order Processing Webhook**
```typescript
// Process DIY Label order after payment
export const handleOrderPaid = async (order) => {
  const diyEnabled = order.note_attributes?.find(
    attr => attr.name === 'diy_label_enabled' && attr.value === 'true'
  );
  
  if (diyEnabled) {
    const printShopId = order.note_attributes.find(
      attr => attr.name === 'diy_label_print_shop_id'
    )?.value;
    
    // Create DIY Label order
    await createDIYLabelOrder({
      shopifyOrderId: order.id,
      printShopId: parseInt(printShopId),
      orderData: order,
      status: 'pending'
    });
    
    // Process payment split
    await processPaymentSplit(order, printShopId);
    
    // Notify print shop
    await notifyPrintShop(printShopId, order);
  }
};
```

## 💰 Revenue Distribution Model

### Three-Way Split Architecture

#### **Revenue Flow Diagram**
```
Customer Payment ($100)
         ↓
    Shopify Store
         ↓
   ┌─────────────────┐
   │   Distribution  │
   └─────────────────┘
         ↓
   ┌─────┬─────┬─────┐
   │Store│Print│DIY  │
   │Owner│Shop │Label│
   │ 60% │ 30% │ 10% │
   │ $60 │ $30 │ $10 │
   └─────┴─────┴─────┘
```

### Distribution Models

#### **Model 1: Commission-Based (Recommended)**

**Example: $100 Product Order**
```typescript
const calculateDistribution = (orderTotal, printCost) => {
  const storeRevenue = orderTotal - printCost; // $100 - $25 = $75
  const diyLabelCommission = printCost * 0.15; // $25 * 15% = $3.75
  const printShopRevenue = printCost - diyLabelCommission; // $25 - $3.75 = $21.25
  
  return {
    store: storeRevenue, // $75 (75%)
    printShop: printShopRevenue, // $21.25 (21.25%)
    diyLabel: diyLabelCommission // $3.75 (3.75%)
  };
};
```

**Benefits:**
- ✅ Store keeps full product markup
- ✅ Print shop gets fair compensation
- ✅ DIY Label earns sustainable commission
- ✅ Scales with order volume

#### **Model 2: Fixed Fee Structure**

**Example: $100 Product Order**
```typescript
const fixedFeeDistribution = (orderTotal) => {
  const diyLabelFee = 5.00; // Fixed $5 per order
  const printCost = 20.00; // Fixed print cost
  const storeRevenue = orderTotal - printCost - diyLabelFee;
  
  return {
    store: storeRevenue, // $75 (75%)
    printShop: printCost, // $20 (20%)
    diyLabel: diyLabelFee // $5 (5%)
  };
};
```

**Benefits:**
- ✅ Predictable costs for all parties
- ✅ Simple to understand and calculate
- ✅ Good for high-volume, low-margin products

#### **Model 3: Tiered Commission**

```typescript
const tieredCommission = (monthlyVolume, printCost) => {
  let commissionRate;
  
  if (monthlyVolume < 100) {
    commissionRate = 0.20; // 20% for new stores
  } else if (monthlyVolume < 500) {
    commissionRate = 0.15; // 15% for growing stores
  } else {
    commissionRate = 0.10; // 10% for high-volume stores
  }
  
  return printCost * commissionRate;
};
```

**Benefits:**
- ✅ Incentivizes growth
- ✅ Rewards loyal customers
- ✅ Competitive for high-volume stores

### Payment Processing Implementation

#### **Stripe Connect Setup**
```typescript
// 1. Create connected accounts for print shops
const createPrintShopAccount = async (printShopData) => {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: printShopData.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });
  
  return account.id;
};

// 2. Process payment split after order
const processPaymentSplit = async (order, printShopId) => {
  const distribution = calculateDistribution(
    order.total_price, 
    order.diy_label_print_cost
  );
  
  // Transfer to print shop
  await stripe.transfers.create({
    amount: Math.round(distribution.printShop * 100),
    currency: 'usd',
    destination: printShop.stripe_account_id,
    transfer_group: `order_${order.id}`
  });
  
  // DIY Label commission stays in platform account
  await recordCommission({
    orderId: order.id,
    amount: distribution.diyLabel,
    storeId: order.store_id
  });
};
```

#### **Automated Payouts**
```typescript
// Weekly payout to print shops
const processWeeklyPayouts = async () => {
  const printShops = await getPrintShopsWithPendingPayouts();
  
  for (const shop of printShops) {
    const pendingAmount = await calculatePendingAmount(shop.id);
    
    if (pendingAmount > 25.00) { // Minimum payout threshold
      await stripe.transfers.create({
        amount: Math.round(pendingAmount * 100),
        currency: 'usd',
        destination: shop.stripe_account_id,
        description: `Weekly payout for ${shop.name}`
      });
      
      await markPayoutProcessed(shop.id, pendingAmount);
    }
  }
};
```

### Revenue Optimization Strategies

#### **Dynamic Pricing**
```typescript
const calculateDynamicPricing = (orderData) => {
  let basePrintCost = 15.00;
  
  // Complexity multiplier
  if (orderData.design_complexity === 'high') {
    basePrintCost *= 1.5;
  }
  
  // Rush order premium
  if (orderData.rush_order) {
    basePrintCost *= 1.3;
  }
  
  // Sustainability discount
  if (orderData.reused_apparel) {
    basePrintCost *= 0.9;
  }
  
  // Location-based pricing
  const locationMultiplier = getLocationMultiplier(orderData.print_shop_location);
  basePrintCost *= locationMultiplier;
  
  return basePrintCost;
};
```

#### **Volume Incentives**
```typescript
const calculateVolumeDiscount = (storeId, monthlyVolume) => {
  const baseCommissionRate = 0.15;
  
  if (monthlyVolume > 1000) {
    return baseCommissionRate * 0.7; // 30% discount
  } else if (monthlyVolume > 500) {
    return baseCommissionRate * 0.8; // 20% discount
  } else if (monthlyVolume > 100) {
    return baseCommissionRate * 0.9; // 10% discount
  }
  
  return baseCommissionRate;
};
```

### Financial Reporting

#### **Store Owner Dashboard**
```typescript
const getStoreFinancials = async (storeId, period) => {
  const orders = await getDIYLabelOrders(storeId, period);
  
  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total_price, 0),
    diyLabelFees: orders.reduce((sum, o) => sum + o.diy_label_commission, 0),
    printCosts: orders.reduce((sum, o) => sum + o.print_cost, 0),
    netProfit: orders.reduce((sum, o) => sum + o.store_profit, 0),
    averageOrderValue: orders.reduce((sum, o) => sum + o.total_price, 0) / orders.length,
    sustainabilityImpact: {
      co2Saved: orders.length * 2.5, // kg CO2 per order
      localSpending: orders.reduce((sum, o) => sum + o.print_cost, 0)
    }
  };
};
```

#### **Print Shop Dashboard**
```typescript
const getPrintShopFinancials = async (printShopId, period) => {
  const orders = await getPrintShopOrders(printShopId, period);
  
  return {
    totalOrders: orders.length,
    totalEarnings: orders.reduce((sum, o) => sum + o.print_shop_revenue, 0),
    pendingPayouts: await getPendingPayouts(printShopId),
    averageOrderValue: orders.reduce((sum, o) => sum + o.print_shop_revenue, 0) / orders.length,
    completionRate: orders.filter(o => o.status === 'completed').length / orders.length,
    customerRating: await getAverageRating(printShopId)
  };
};
```

### Tax Considerations

#### **1099 Generation for Print Shops**
```typescript
const generate1099Forms = async (taxYear) => {
  const printShops = await getPrintShopsWithEarnings(taxYear);
  
  for (const shop of printShops) {
    const totalEarnings = await getTotalEarnings(shop.id, taxYear);
    
    if (totalEarnings >= 600) { // IRS threshold
      await generateForm1099({
        recipientName: shop.business_name,
        recipientTIN: shop.tax_id,
        payerName: 'DIY Label Inc.',
        payerTIN: 'DIY_LABEL_TIN',
        totalEarnings: totalEarnings,
        taxYear: taxYear
      });
    }
  }
};
```

#### **Sales Tax Handling**
```typescript
const calculateSalesTax = (orderData) => {
  const { customerAddress, printShopAddress, orderTotal } = orderData;
  
  // Determine tax jurisdiction
  const taxJurisdiction = determineTaxJurisdiction(
    customerAddress, 
    printShopAddress
  );
  
  // Calculate tax based on local rates
  const taxRate = getTaxRate(taxJurisdiction);
  const taxAmount = orderTotal * taxRate;
  
  return {
    jurisdiction: taxJurisdiction,
    rate: taxRate,
    amount: taxAmount
  };
};
```

## 📊 Success Metrics & KPIs

### Platform Metrics
- **Monthly Recurring Revenue (MRR)**: Target $50K+ by month 12
- **Order Volume**: Target 1,000+ DIY Label orders/month
- **Print Shop Network**: Target 100+ active print shops
- **Geographic Coverage**: Target 50+ cities

### Store Owner Metrics
- **DIY Label Adoption Rate**: % of eligible orders using local printing
- **Customer Satisfaction**: Rating for DIY Label orders
- **Revenue Impact**: Additional revenue from local printing premium
- **Sustainability Impact**: CO2 reduction vs. traditional shipping

### Print Shop Metrics
- **Monthly Earnings**: Average revenue per print shop
- **Order Completion Rate**: % of orders completed on time
- **Customer Rating**: Average rating from customers
- **Capacity Utilization**: % of available printing capacity used

This comprehensive integration ensures seamless checkout experience while creating a sustainable three-way revenue model that benefits stores, print shops, and the DIY Label platform.