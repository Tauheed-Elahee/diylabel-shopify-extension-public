# 🛒 Shopify Checkout Extensions: Complete Guide

Deep dive into implementing DIY Label with Shopify's powerful Checkout Extensions system.

## 🎯 What Are Checkout Extensions?

Checkout Extensions are Shopify's modern way to customize the checkout experience without touching theme code. They run in a secure, sandboxed environment and provide native integration with Shopify's checkout flow.

### Key Benefits

#### **For Merchants**
- ✅ **Native Integration**: Seamless part of Shopify checkout
- ✅ **Mobile Optimized**: Works perfectly on all devices
- ✅ **Performance**: Fast loading, no impact on checkout speed
- ✅ **Security**: Runs in Shopify's secure environment
- ✅ **Future-Proof**: Automatically updates with Shopify improvements

#### **For Customers**
- ✅ **Consistent Experience**: Matches Shopify's design system
- ✅ **Trust**: Clearly part of the official checkout process
- ✅ **Accessibility**: Built-in accessibility features
- ✅ **Speed**: No external iframes or slow loading

#### **For Developers**
- ✅ **React-Based**: Modern development experience
- ✅ **TypeScript Support**: Full type safety
- ✅ **Real-Time Data**: Access to live cart and customer data
- ✅ **Shopify APIs**: Direct integration with Shopify's systems

## 🏗️ Architecture Overview

### Extension Types for DIY Label

#### **1. Purchase Checkout Block**
Shows DIY Label information during checkout
```
Location: purchase.checkout.block.render
Purpose: Display selected print shop, allow modifications
```

#### **2. Purchase Checkout Action**
Adds DIY Label actions to checkout
```
Location: purchase.checkout.actions.render
Purpose: Quick print shop selection, sustainability messaging
```

#### **3. Thank You Block**
Confirmation after purchase
```
Location: purchase.thank-you.block.render
Purpose: Order confirmation, tracking info, next steps
```

#### **4. Customer Account Order Status**
Order tracking in customer account
```
Location: customer-account.order-status.block.render
Purpose: Real-time order updates, print shop communication
```

## 🚀 Implementation Guide

### Step 1: Create Checkout Extension

```bash
cd diy-label
shopify app generate extension
```

Choose:
- **Extension type**: `Checkout UI extension`
- **Name**: `DIY Label Checkout`
- **Language**: `TypeScript React`

### Step 2: Main Checkout Extension

**File: `extensions/diy-label-checkout/src/Checkout.tsx`**

```typescript
import {
  reactExtension,
  useCartLines,
  useApplyAttributeChange,
  useAttributes,
  Banner,
  BlockStack,
  Button,
  Text,
  InlineLayout,
  Icon,
  Pressable,
  Modal,
  TextBlock,
  Image
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <DIYLabelCheckout />
);

function DIYLabelCheckout() {
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  
  // Check if cart has DIY Label enabled products
  const diyLabelEnabled = attributes.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );
  
  const selectedPrintShop = attributes.find(
    attr => attr.key === 'diy_label_print_shop_name'
  )?.value;
  
  const printShopAddress = attributes.find(
    attr => attr.key === 'diy_label_print_shop_address'
  )?.value;
  
  const estimatedCompletion = attributes.find(
    attr => attr.key === 'diy_label_estimated_completion'
  )?.value;
  
  // Don't show if no DIY Label products
  if (!diyLabelEnabled) return null;
  
  const handleChangePrintShop = async () => {
    // Open print shop selection modal
    // This would trigger a modal or redirect to selection page
    console.log('Opening print shop selection...');
  };
  
  const handleRemoveDIYLabel = async () => {
    // Remove DIY Label from order
    await applyAttributeChange({
      type: 'updateAttribute',
      key: 'diy_label_enabled',
      value: 'false'
    });
  };
  
  return (
    <BlockStack spacing="base">
      {/* Main DIY Label Banner */}
      <Banner status="success">
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="center">
            <Icon source="leaf" />
            <Text emphasis="bold">Local Printing Selected</Text>
          </InlineLayout>
          
          <Text>
            Your order will be printed locally to reduce shipping impact 
            and support your community.
          </Text>
        </BlockStack>
      </Banner>
      
      {/* Print Shop Details */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold" size="medium">Print Shop Details</Text>
        
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="center">
            <Icon source="location" />
            <Text emphasis="bold">{selectedPrintShop}</Text>
          </InlineLayout>
          
          <Text size="small" appearance="subdued">
            {printShopAddress}
          </Text>
          
          {estimatedCompletion && (
            <InlineLayout spacing="tight" blockAlignment="center">
              <Icon source="clock" />
              <Text size="small">
                Ready for pickup: {estimatedCompletion}
              </Text>
            </InlineLayout>
          )}
        </BlockStack>
        
        {/* Action Buttons */}
        <InlineLayout spacing="base">
          <Button
            kind="secondary"
            size="small"
            onPress={handleChangePrintShop}
          >
            Change Print Shop
          </Button>
          
          <Button
            kind="plain"
            size="small"
            onPress={handleRemoveDIYLabel}
          >
            Remove Local Printing
          </Button>
        </InlineLayout>
      </BlockStack>
      
      {/* Sustainability Impact */}
      <BlockStack spacing="tight" padding="base" border="base" cornerRadius="base">
        <InlineLayout spacing="tight" blockAlignment="center">
          <Icon source="recycle" />
          <Text emphasis="bold" size="small">Environmental Impact</Text>
        </InlineLayout>
        
        <Text size="small" appearance="subdued">
          By choosing local printing, you're saving approximately 2.5kg of CO₂ 
          compared to traditional shipping methods.
        </Text>
      </BlockStack>
    </BlockStack>
  );
}
```

### Step 3: Print Shop Selection Modal

**File: `extensions/diy-label-checkout/src/PrintShopSelector.tsx`**

```typescript
import {
  reactExtension,
  useApi,
  Modal,
  BlockStack,
  Text,
  Button,
  InlineLayout,
  Icon,
  Pressable,
  Image,
  Badge
} from '@shopify/ui-extensions-react/checkout';

interface PrintShop {
  id: number;
  name: string;
  address: string;
  rating: number;
  distance: number;
  estimatedCompletion: string;
  capabilities: string[];
  image?: string;
}

export function PrintShopSelector({ 
  isOpen, 
  onClose, 
  onSelect,
  currentLocation 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (shop: PrintShop) => void;
  currentLocation?: { lat: number; lng: number };
}) {
  const { query } = useApi();
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && currentLocation) {
      loadNearbyPrintShops();
    }
  }, [isOpen, currentLocation]);
  
  const loadNearbyPrintShops = async () => {
    setLoading(true);
    try {
      // This would call your DIY Label API
      const response = await fetch(
        `/api/print-shops/nearby?lat=${currentLocation.lat}&lng=${currentLocation.lng}&radius=25`
      );
      const data = await response.json();
      setPrintShops(data.printShops || []);
    } catch (error) {
      console.error('Failed to load print shops:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectShop = (shop: PrintShop) => {
    onSelect(shop);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal onClose={onClose} title="Choose Print Shop">
      <BlockStack spacing="base">
        <Text>
          Select a local print shop for your order. All shops are verified 
          partners with quality guarantees.
        </Text>
        
        {loading ? (
          <Text>Loading nearby print shops...</Text>
        ) : (
          <BlockStack spacing="base">
            {printShops.map((shop) => (
              <Pressable
                key={shop.id}
                onPress={() => handleSelectShop(shop)}
                border="base"
                padding="base"
                cornerRadius="base"
              >
                <BlockStack spacing="tight">
                  <InlineLayout spacing="base" blockAlignment="start">
                    {shop.image && (
                      <Image
                        source={shop.image}
                        alt={shop.name}
                        aspectRatio={1}
                        fit="cover"
                        cornerRadius="small"
                      />
                    )}
                    
                    <BlockStack spacing="tight">
                      <InlineLayout spacing="tight" blockAlignment="center">
                        <Text emphasis="bold">{shop.name}</Text>
                        <Badge status="success">
                          ⭐ {shop.rating.toFixed(1)}
                        </Badge>
                      </InlineLayout>
                      
                      <Text size="small" appearance="subdued">
                        {shop.address}
                      </Text>
                      
                      <InlineLayout spacing="tight" blockAlignment="center">
                        <Icon source="location" />
                        <Text size="small">
                          {shop.distance.toFixed(1)} miles away
                        </Text>
                      </InlineLayout>
                      
                      <InlineLayout spacing="tight" blockAlignment="center">
                        <Icon source="clock" />
                        <Text size="small">
                          Ready: {shop.estimatedCompletion}
                        </Text>
                      </InlineLayout>
                      
                      {shop.capabilities.length > 0 && (
                        <InlineLayout spacing="tight">
                          {shop.capabilities.map((capability) => (
                            <Badge key={capability} status="info">
                              {capability}
                            </Badge>
                          ))}
                        </InlineLayout>
                      )}
                    </BlockStack>
                  </InlineLayout>
                  
                  <Button kind="primary" size="small">
                    Select This Shop
                  </Button>
                </BlockStack>
              </Pressable>
            ))}
          </BlockStack>
        )}
        
        {printShops.length === 0 && !loading && (
          <BlockStack spacing="base" inlineAlignment="center">
            <Text>No print shops found in your area.</Text>
            <Button kind="secondary" onPress={onClose}>
              Continue Without Local Printing
            </Button>
          </BlockStack>
        )}
      </BlockStack>
    </Modal>
  );
}
```

### Step 4: Thank You Page Extension

**File: `extensions/diy-label-checkout/src/ThankYou.tsx`**

```typescript
import {
  reactExtension,
  useOrder,
  Banner,
  BlockStack,
  Text,
  Button,
  InlineLayout,
  Icon,
  Link
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <DIYLabelThankYou />
);

function DIYLabelThankYou() {
  const order = useOrder();
  
  const diyLabelEnabled = order?.attributes?.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );
  
  if (!diyLabelEnabled) return null;
  
  const printShopName = order?.attributes?.find(
    attr => attr.key === 'diy_label_print_shop_name'
  )?.value;
  
  const printShopAddress = order?.attributes?.find(
    attr => attr.key === 'diy_label_print_shop_address'
  )?.value;
  
  const estimatedCompletion = order?.attributes?.find(
    attr => attr.key === 'diy_label_estimated_completion'
  )?.value;
  
  return (
    <BlockStack spacing="base">
      {/* Success Banner */}
      <Banner status="success">
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="center">
            <Icon source="checkmark" />
            <Text emphasis="bold">Your order is going local!</Text>
          </InlineLayout>
          
          <Text>
            Your items will be printed at {printShopName} and will be ready 
            for pickup on {estimatedCompletion}.
          </Text>
        </BlockStack>
      </Banner>
      
      {/* Print Shop Information */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold">Print Shop Details</Text>
        
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="center">
            <Icon source="location" />
            <Text emphasis="bold">{printShopName}</Text>
          </InlineLayout>
          
          <Text size="small" appearance="subdued">
            {printShopAddress}
          </Text>
          
          <InlineLayout spacing="tight" blockAlignment="center">
            <Icon source="clock" />
            <Text size="small">
              Estimated ready: {estimatedCompletion}
            </Text>
          </InlineLayout>
        </BlockStack>
      </BlockStack>
      
      {/* Next Steps */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold">What happens next?</Text>
        
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="start">
            <Text>1.</Text>
            <Text size="small">
              We'll send your order details to {printShopName}
            </Text>
          </InlineLayout>
          
          <InlineLayout spacing="tight" blockAlignment="start">
            <Text>2.</Text>
            <Text size="small">
              You'll receive updates as your order is printed
            </Text>
          </InlineLayout>
          
          <InlineLayout spacing="tight" blockAlignment="start">
            <Text>3.</Text>
            <Text size="small">
              Pick up your order when it's ready (we'll notify you!)
            </Text>
          </InlineLayout>
        </BlockStack>
      </BlockStack>
      
      {/* Sustainability Impact */}
      <BlockStack spacing="tight" padding="base" border="base" cornerRadius="base">
        <InlineLayout spacing="tight" blockAlignment="center">
          <Icon source="leaf" />
          <Text emphasis="bold" size="small">Environmental Impact</Text>
        </InlineLayout>
        
        <Text size="small" appearance="subdued">
          By choosing local printing, you've helped save approximately 2.5kg of CO₂ 
          and supported your local community. Thank you for making a sustainable choice!
        </Text>
      </BlockStack>
      
      {/* Action Buttons */}
      <InlineLayout spacing="base">
        <Button
          kind="secondary"
          to={`/orders/${order?.id}/track`}
        >
          Track Your Order
        </Button>
        
        <Link to={`/print-shops/${printShopName}`}>
          <Button kind="plain">
            View Print Shop
          </Button>
        </Link>
      </InlineLayout>
    </BlockStack>
  );
}
```

### Step 5: Customer Account Extension

**File: `extensions/diy-label-checkout/src/CustomerAccount.tsx`**

```typescript
import {
  reactExtension,
  useOrder,
  BlockStack,
  Text,
  Button,
  InlineLayout,
  Icon,
  Badge,
  ProgressIndicator
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <DIYLabelOrderStatus />
);

function DIYLabelOrderStatus() {
  const order = useOrder();
  const [orderStatus, setOrderStatus] = useState(null);
  
  const diyLabelEnabled = order?.attributes?.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );
  
  useEffect(() => {
    if (diyLabelEnabled && order?.id) {
      fetchDIYLabelOrderStatus(order.id);
    }
  }, [diyLabelEnabled, order?.id]);
  
  const fetchDIYLabelOrderStatus = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/diy-label-status`);
      const data = await response.json();
      setOrderStatus(data);
    } catch (error) {
      console.error('Failed to fetch DIY Label status:', error);
    }
  };
  
  if (!diyLabelEnabled || !orderStatus) return null;
  
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { status: 'info', label: 'Order Received' },
      printing: { status: 'attention', label: 'Printing' },
      ready: { status: 'warning', label: 'Ready for Pickup' },
      completed: { status: 'success', label: 'Completed' },
      cancelled: { status: 'critical', label: 'Cancelled' }
    };
    
    return statusMap[status] || statusMap.pending;
  };
  
  const statusInfo = getStatusBadge(orderStatus.status);
  
  return (
    <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
      <InlineLayout spacing="tight" blockAlignment="center">
        <Icon source="leaf" />
        <Text emphasis="bold">Local Printing Status</Text>
        <Badge status={statusInfo.status}>
          {statusInfo.label}
        </Badge>
      </InlineLayout>
      
      {/* Progress Indicator */}
      <ProgressIndicator
        progress={getProgressPercentage(orderStatus.status)}
        size="small"
      />
      
      {/* Print Shop Info */}
      <BlockStack spacing="tight">
        <Text size="small" emphasis="bold">
          {orderStatus.printShop.name}
        </Text>
        <Text size="small" appearance="subdued">
          {orderStatus.printShop.address}
        </Text>
      </BlockStack>
      
      {/* Status Updates */}
      {orderStatus.updates && orderStatus.updates.length > 0 && (
        <BlockStack spacing="tight">
          <Text size="small" emphasis="bold">Recent Updates</Text>
          {orderStatus.updates.slice(0, 3).map((update, index) => (
            <InlineLayout key={index} spacing="tight" blockAlignment="start">
              <Icon source="clock" />
              <BlockStack spacing="extraTight">
                <Text size="small">{update.message}</Text>
                <Text size="extraSmall" appearance="subdued">
                  {new Date(update.timestamp).toLocaleDateString()}
                </Text>
              </BlockStack>
            </InlineLayout>
          ))}
        </BlockStack>
      )}
      
      {/* Action Buttons */}
      <InlineLayout spacing="base">
        {orderStatus.status === 'ready' && (
          <Button kind="primary" size="small">
            Get Pickup Directions
          </Button>
        )}
        
        <Button
          kind="secondary"
          size="small"
          to={`/print-shops/${orderStatus.printShop.id}/contact`}
        >
          Contact Print Shop
        </Button>
      </InlineLayout>
    </BlockStack>
  );
}

function getProgressPercentage(status) {
  const progressMap = {
    pending: 25,
    printing: 50,
    ready: 75,
    completed: 100,
    cancelled: 0
  };
  
  return progressMap[status] || 0;
}
```

## 🔧 Advanced Features

### Real-Time Updates

```typescript
// Use Shopify's real-time capabilities
import { useSubscription } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const subscription = useSubscription();
  
  useEffect(() => {
    // Subscribe to order updates
    const unsubscribe = subscription.subscribe(
      'diy-label-order-update',
      (data) => {
        // Update UI with real-time order status
        updateOrderStatus(data);
      }
    );
    
    return unsubscribe;
  }, [subscription]);
  
  // ... rest of component
}
```

### Location Services Integration

```typescript
// Request customer location for print shop suggestions
import { useGeolocation } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const geolocation = useGeolocation();
  const [nearbyShops, setNearbyShops] = useState([]);
  
  useEffect(() => {
    if (geolocation.coordinates) {
      loadNearbyShops(geolocation.coordinates);
    }
  }, [geolocation.coordinates]);
  
  const loadNearbyShops = async (coordinates) => {
    const response = await fetch(
      `/api/print-shops/nearby?lat=${coordinates.latitude}&lng=${coordinates.longitude}`
    );
    const data = await response.json();
    setNearbyShops(data.printShops);
  };
  
  // ... rest of component
}
```

### Dynamic Pricing Display

```typescript
// Show pricing adjustments for local printing
function PricingAdjustment({ originalPrice, localPrintingCost }) {
  const savings = originalPrice.shipping - localPrintingCost.pickup;
  
  return (
    <BlockStack spacing="tight">
      <Text size="small" emphasis="bold">Pricing Breakdown</Text>
      
      <InlineLayout spacing="between">
        <Text size="small">Product Price</Text>
        <Text size="small">${originalPrice.product}</Text>
      </InlineLayout>
      
      <InlineLayout spacing="between">
        <Text size="small">Local Printing</Text>
        <Text size="small">${localPrintingCost.printing}</Text>
      </InlineLayout>
      
      <InlineLayout spacing="between">
        <Text size="small" appearance="subdued">
          Shipping (saved)
        </Text>
        <Text size="small" appearance="subdued">
          -${originalPrice.shipping}
        </Text>
      </InlineLayout>
      
      {savings > 0 && (
        <InlineLayout spacing="between">
          <Text size="small" emphasis="bold">You Save</Text>
          <Text size="small" emphasis="bold" appearance="success">
            ${savings.toFixed(2)}
          </Text>
        </InlineLayout>
      )}
    </BlockStack>
  );
}
```

## 📱 Mobile Optimization

### Responsive Design

```typescript
// Automatically responsive with Shopify's UI components
import { useViewportSize } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const viewport = useViewportSize();
  const isMobile = viewport.width < 768;
  
  return (
    <BlockStack spacing={isMobile ? "tight" : "base"}>
      {/* Content automatically adapts to mobile */}
      <InlineLayout 
        spacing="base" 
        blockAlignment="center"
        columns={isMobile ? 1 : 2}
      >
        {/* Mobile-optimized layout */}
      </InlineLayout>
    </BlockStack>
  );
}
```

### Touch-Friendly Interactions

```typescript
// Optimized for mobile touch
<Pressable
  onPress={handleSelectShop}
  padding="base"
  cornerRadius="base"
  overlay={
    <BlockStack spacing="tight">
      {/* Touch-friendly content */}
    </BlockStack>
  }
>
  {/* Pressable content */}
</Pressable>
```

## 🚀 Deployment & Testing

### Extension Configuration

**File: `extensions/diy-label-checkout/shopify.extension.toml`**

```toml
api_version = "2024-04"

[[extensions]]
type = "checkout_ui_extension"
name = "DIY Label Checkout"
handle = "diy-label-checkout"

[extensions.capabilities]
network_access = true
block_progress = false

[extensions.settings]
[[extensions.settings.fields]]
key = "enable_sustainability_messaging"
type = "boolean"
name = "Show sustainability impact"
description = "Display environmental benefits of local printing"

[[extensions.settings.fields]]
key = "default_radius"
type = "number_integer"
name = "Default search radius (miles)"
description = "How far to search for print shops by default"
```

### Testing Strategy

#### **1. Development Testing**
```bash
# Test in development
shopify app dev

# Test specific extension
shopify app dev --extension=diy-label-checkout
```

#### **2. Preview Testing**
```bash
# Generate preview link
shopify app generate extension --template=checkout_ui_extension

# Test on real checkout
# Use preview link in development store
```

#### **3. A/B Testing**
```typescript
// Built-in A/B testing support
import { useExperiment } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const experiment = useExperiment('diy-label-messaging');
  
  const showSustainabilityMessage = experiment.variant === 'sustainability';
  
  return (
    <BlockStack>
      {showSustainabilityMessage ? (
        <SustainabilityMessage />
      ) : (
        <StandardMessage />
      )}
    </BlockStack>
  );
}
```

## 📊 Analytics & Performance

### Built-in Analytics

```typescript
// Track extension performance
import { useAnalytics } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const analytics = useAnalytics();
  
  const handlePrintShopSelection = (shop) => {
    // Track user interaction
    analytics.track('diy_label_print_shop_selected', {
      shop_id: shop.id,
      shop_name: shop.name,
      distance: shop.distance
    });
    
    selectPrintShop(shop);
  };
  
  useEffect(() => {
    // Track extension view
    analytics.track('diy_label_checkout_viewed');
  }, []);
  
  // ... rest of component
}
```

### Performance Monitoring

```typescript
// Monitor extension performance
import { usePerformance } from '@shopify/ui-extensions-react/checkout';

function DIYLabelCheckout() {
  const performance = usePerformance();
  
  useEffect(() => {
    const startTime = performance.now();
    
    loadPrintShops().then(() => {
      const loadTime = performance.now() - startTime;
      
      // Track loading performance
      analytics.track('diy_label_load_time', {
        duration: loadTime
      });
    });
  }, []);
  
  // ... rest of component
}
```

## 🎯 Best Practices

### User Experience

#### **1. Progressive Enhancement**
- Start with basic functionality
- Add advanced features gradually
- Graceful degradation for unsupported features

#### **2. Clear Communication**
- Use clear, simple language
- Provide helpful tooltips and explanations
- Show progress indicators for long operations

#### **3. Error Handling**
```typescript
function DIYLabelCheckout() {
  const [error, setError] = useState(null);
  
  const handleError = (error) => {
    setError(error.message);
    
    // Log error for debugging
    console.error('DIY Label error:', error);
    
    // Track error for analytics
    analytics.track('diy_label_error', {
      error: error.message,
      stack: error.stack
    });
  };
  
  if (error) {
    return (
      <Banner status="critical">
        <Text>
          Unable to load local printing options. 
          Your order will proceed with standard shipping.
        </Text>
      </Banner>
    );
  }
  
  // ... rest of component
}
```

### Performance Optimization

#### **1. Lazy Loading**
```typescript
// Lazy load heavy components
const PrintShopMap = lazy(() => import('./PrintShopMap'));

function DIYLabelCheckout() {
  const [showMap, setShowMap] = useState(false);
  
  return (
    <BlockStack>
      <Button onPress={() => setShowMap(true)}>
        View Print Shops on Map
      </Button>
      
      {showMap && (
        <Suspense fallback={<Text>Loading map...</Text>}>
          <PrintShopMap />
        </Suspense>
      )}
    </BlockStack>
  );
}
```

#### **2. Data Caching**
```typescript
// Cache print shop data
const usePrintShops = (location) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const cacheKey = `print-shops-${location.lat}-${location.lng}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      setShops(JSON.parse(cached));
    } else {
      setLoading(true);
      fetchPrintShops(location).then((data) => {
        setShops(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setLoading(false);
      });
    }
  }, [location]);
  
  return { shops, loading };
};
```

## 🔮 Future Enhancements

### Advanced Features Roadmap

#### **Phase 1: Enhanced UX**
- Real-time print shop availability
- Live order tracking with photos
- Customer-print shop messaging
- Pickup scheduling

#### **Phase 2: Smart Features**
- AI-powered print shop recommendations
- Predictive delivery times
- Dynamic pricing based on demand
- Quality prediction algorithms

#### **Phase 3: Ecosystem Integration**
- Integration with local delivery services
- Partnership with eco-friendly suppliers
- Carbon offset calculations
- Community impact metrics

Checkout Extensions provide the most powerful and native way to integrate DIY Label with Shopify's checkout process, offering superior user experience, performance, and future-proofing compared to other integration methods.