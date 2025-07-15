# Using Shopify Checkout API for Location Data

## Overview

This document outlines the plan to modify the DIY Label Checkout UI Extension to use location data from the Shopify Checkout API instead of relying solely on browser geolocation (`navigator.geolocation`). This approach provides a more seamless user experience by leveraging pre-filled or inferred addresses without requiring explicit browser permission popups.

## Current Implementation Issues

The current implementation in `diy-label/extensions/diy-label/src/Checkout.tsx` uses `navigator.geolocation` which:
- Triggers a browser permission popup
- May be denied by users
- Provides a less seamless experience compared to native Shopify pickup functionality
- Doesn't leverage address data already available in the checkout context

## Shopify Checkout API Location Sources

The Shopify Checkout API provides several sources of location data through the `useApi` hook:

### 1. `buyerIdentity`
- Contains customer information including addresses
- Available for logged-in customers or when address is pre-filled
- Provides structured address data that can be geocoded

### 2. `deliveryGroups`
- Contains delivery/shipping address information
- Available when customer has entered shipping details
- Most accurate source as it represents the actual delivery location

### 3. Address Structure
Both sources provide address objects with:
- `address1`, `address2`
- `city`
- `provinceCode` / `province`
- `countryCode` / `country`
- `zip` / `postalCode`

## Implementation Plan

### Phase 1: Modify Checkout Extension

**File:** `diy-label/extensions/diy-label/src/Checkout.tsx`

#### Step 1: Import Additional Hooks
```typescript
import {
  // ... existing imports
  useBuyerIdentity,
  useDeliveryGroups,
} from "@shopify/ui-extensions-react/checkout";
```

#### Step 2: Access Checkout Data
```typescript
function Extension() {
  // ... existing code
  const buyerIdentity = useBuyerIdentity();
  const deliveryGroups = useDeliveryGroups();
  
  // ... rest of component
}
```

#### Step 3: Create Location Resolution Function
```typescript
async function getLocationFromCheckout(): Promise<{ lat: number; lng: number } | null> {
  // Priority 1: Delivery address from deliveryGroups
  const deliveryAddress = deliveryGroups[0]?.deliveryAddress;
  if (deliveryAddress) {
    return await geocodeAddress(deliveryAddress);
  }
  
  // Priority 2: Buyer identity address
  const buyerAddress = buyerIdentity?.deliveryAddress;
  if (buyerAddress) {
    return await geocodeAddress(buyerAddress);
  }
  
  return null;
}
```

#### Step 4: Create Geocoding Function
```typescript
async function geocodeAddress(address: any): Promise<{ lat: number; lng: number } | null> {
  try {
    const addressString = [
      address.address1,
      address.city,
      address.provinceCode || address.province,
      address.countryCode || address.country,
      address.zip
    ].filter(Boolean).join(', ');
    
    // Call your backend geocoding service
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(addressString)}`);
    const data = await response.json();
    
    if (data.lat && data.lng) {
      return { lat: data.lat, lng: data.lng };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
  
  return null;
}
```

#### Step 5: Update Location Loading Logic
```typescript
useEffect(() => {
  const loadPrintShops = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Try to get location from Shopify checkout data first
      let location = await getLocationFromCheckout();
      
      // Fallback to browser geolocation if no checkout address available
      if (!location) {
        try {
          location = await getUserLocation();
        } catch (geoError) {
          setError('Please enter your shipping address to find nearby print shops');
          return;
        }
      }
      
      setUserLocation(location);
      await fetchPrintShops(location);
      
    } catch (error) {
      setError('Failed to load print shops');
    } finally {
      setLoading(false);
    }
  };

  if (!diyLabelEnabled && hasCartItems) {
    loadPrintShops();
  }
}, [diyLabelEnabled, hasCartItems, deliveryGroups, buyerIdentity]);
```

### Phase 2: Create Geocoding Backend Service

**File:** `diy-label/app/routes/api.geocode.tsx`

```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');
  
  if (!address) {
    return json({ error: 'Address is required' }, { status: 400 });
  }
  
  try {
    // Use a geocoding service (Google Maps, Mapbox, etc.)
    const geocodingResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.VITE_MAPBOX_TOKEN}`
    );
    
    const data = await geocodingResponse.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return json({ lat, lng });
    }
    
    return json({ error: 'Address not found' }, { status: 404 });
  } catch (error) {
    return json({ error: 'Geocoding failed' }, { status: 500 });
  }
};
```

### Phase 3: Update Extension Configuration

**File:** `diy-label/extensions/diy-label/shopify.extension.toml`

Ensure the extension has the necessary capabilities:

```toml
[extensions.capabilities]
api_access = true
network_access = true

# Add buyer identity access if needed
[[extensions.metafields]]
namespace = "custom"
key = "buyer_identity"
```

## Benefits of This Approach

1. **Seamless Experience**: No browser permission popups for most users
2. **Higher Success Rate**: Leverages addresses users have already provided
3. **Better Accuracy**: Uses actual delivery addresses rather than device location
4. **Graceful Fallback**: Still supports geolocation for edge cases
5. **Consistent with Shopify UX**: Matches native pickup functionality behavior

## Implementation Priority

1. **High Priority**: Implement checkout API location detection
2. **Medium Priority**: Create geocoding backend service
3. **Low Priority**: Optimize error handling and edge cases

## Testing Strategy

1. **Test with logged-in customers** who have saved addresses
2. **Test with guest checkout** after entering shipping address
3. **Test fallback behavior** when no address is available
4. **Test error handling** for geocoding failures
5. **Test across different address formats** (international addresses)

## Considerations

- **Geocoding Rate Limits**: Implement caching for repeated address lookups
- **Privacy**: Ensure address data is only used for print shop location
- **Performance**: Cache geocoded results to avoid repeated API calls
- **Error Handling**: Provide clear messaging when location cannot be determined
- **International Support**: Handle different address formats and geocoding services

## Success Metrics

- Reduced geolocation permission prompts
- Higher print shop selection completion rates
- Improved user experience scores
- Faster time to print shop display
- Reduced location-related errors

This approach aligns the DIY Label extension with Shopify's native pickup functionality while maintaining the flexibility to fall back to browser geolocation when needed.