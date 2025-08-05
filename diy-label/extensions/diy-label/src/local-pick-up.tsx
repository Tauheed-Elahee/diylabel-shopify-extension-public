import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  Button,
  useTranslate,
  useShippingAddress,
  useCartLines,
  useAttributes,
  useApplyAttributeChange,
  useCustomer,
  usePickupLocations,
  usePickupLocationOptionTarget,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

export default reactExtension(
  "purchase.checkout.pickup-location-list.render-before",
  () => <Extension />
);

interface PrintShop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  specialty: string;
  rating: number;
  distance_km?: number;
}

function Extension() {
  const translate = useTranslate();
  const [selectedPrintShop, setSelectedPrintShop] = useState("");
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderCreating, setOrderCreating] = useState(false);

  // Get Shopify data
  const shippingAddress = useShippingAddress();
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  const customer = useCustomer();
  const pickupLocations = usePickupLocations();
  const pickupLocationTarget = usePickupLocationOptionTarget();

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Debug logging
  useEffect(() => {
    console.log('📦 Pickup Location Extension: Component mounted', {
      cartLines: cartLines.length,
      shippingAddress: !!shippingAddress,
      diyLabelEnabled,
      existingPrintShop,
      pickupLocations: pickupLocations.length,
      pickupLocationTarget: pickupLocationTarget?.handle
    });
  }, []);

  // Use Shopify's pickup locations to get coordinates
  const getCoordinatesFromPickupLocations = () => {
    console.log('📦 Available pickup locations:', pickupLocations);
    
    // Find the closest pickup location or use the first one
    if (pickupLocations.length > 0) {
      const location = pickupLocations[0]; // Use first location for now
      console.log('📦 Using pickup location:', location);
      
      // Extract coordinates from the location
      // Note: Shopify pickup locations might not have direct lat/lng
      // We'll need to geocode the address or use a mapping
      
      // For Montreal area, use Montreal coordinates
      if (location.address?.city?.toLowerCase().includes('montreal') || 
          location.address?.city?.toLowerCase().includes('ville-marie')) {
        return { lat: 45.5017, lng: -73.5673 };
      }
      
      // For Ottawa area
      if (location.address?.city?.toLowerCase().includes('ottawa')) {
        return { lat: 45.4215, lng: -75.6972 };
      }
      
      // For Toronto area
      if (location.address?.city?.toLowerCase().includes('toronto')) {
        return { lat: 43.6532, lng: -79.3832 };
      }
      
      // Default to Ottawa if we can't determine
      return { lat: 45.4215, lng: -75.6972 };
    }
    
    return null;
  };

  // Use shipping address as fallback
  const getCoordinatesFromShippingAddress = () => {
    if (!shippingAddress) return null;
    
    console.log('📦 Using shipping address:', shippingAddress);
    
    // Use province and city to determine coordinates
    if (shippingAddress.provinceCode === 'QC' || shippingAddress.province === 'Quebec') {
      if (shippingAddress.city?.toLowerCase().includes('montreal') || 
          shippingAddress.city?.toLowerCase().includes('ville-marie')) {
        console.log('📦 Detected Montreal from shipping address');
        return { lat: 45.5017, lng: -73.5673 };
      } else if (shippingAddress.city?.toLowerCase().includes('quebec')) {
        return { lat: 46.8139, lng: -71.208 };
      }
    } else if (shippingAddress.provinceCode === 'ON' || shippingAddress.province === 'Ontario') {
      if (shippingAddress.city?.toLowerCase().includes('toronto')) {
        return { lat: 43.6532, lng: -79.3832 };
      } else if (shippingAddress.city?.toLowerCase().includes('ottawa')) {
        return { lat: 45.4215, lng: -75.6972 };
      }
    } else if (shippingAddress.provinceCode === 'BC') {
      return { lat: 49.2827, lng: -123.1207 }; // Vancouver
    } else if (shippingAddress.provinceCode === 'AB') {
      return { lat: 51.0447, lng: -114.0719 }; // Calgary
    }
    
    // Default to Ottawa
    return { lat: 45.4215, lng: -75.6972 };
  };

  // Fetch print shops based on coordinates
  const fetchPrintShops = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      setError("");
      
      const apiUrl = `https://diylabel.netlify.app/.netlify/functions/nearby-shops?lat=${lat}&lng=${lng}&radius=50`;
      
      console.log('📦 Fetching print shops from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPrintShops(data.printShops || []);
      
      console.log('📦 Loaded print shops:', data.printShops?.length || 0);
      
      // Reset selected print shop when new shops are loaded
      setSelectedPrintShop("");
      
    } catch (err) {
      console.error('📦 Error fetching print shops:', err);
      setError('Failed to load print shops. Please try again.');
      setPrintShops([]);
    } finally {
      setLoading(false);
    }
  };

  // Load print shops when component mounts or location changes
  useEffect(() => {
    const loadPrintShops = async () => {
      console.log('📦 Loading print shops...');
      
      // Don't load if DIY Label is already enabled
      if (diyLabelEnabled) {
        console.log('📦 DIY Label already enabled, skipping load');
        return;
      }
      
      // Don't load if no cart items
      if (cartLines.length === 0) {
        console.log('📦 No cart items, skipping load');
        return;
      }
      
      // Try to get coordinates from Shopify pickup locations first
      let coordinates = getCoordinatesFromPickupLocations();
      
      // Fallback to shipping address
      if (!coordinates) {
        coordinates = getCoordinatesFromShippingAddress();
      }
      
      if (coordinates) {
        console.log('📦 Using coordinates:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        console.log('📦 No coordinates available, using default Ottawa');
        await fetchPrintShops(45.4215, -75.6972);
      }
    };

    loadPrintShops();
  }, [pickupLocations, shippingAddress, diyLabelEnabled, cartLines.length]);

  // Update cart attributes when print shop selection changes
  const handlePrintShopChange = async (value: string) => {
    console.log('📦 Print shop selection changed to:', value);
    setSelectedPrintShop(value);
    
    try {
      if (!value || value === "") {
        // Clear DIY Label attributes
        console.log('📦 Clearing DIY Label attributes');
        await applyAttributeChange({
          key: "diy_label_enabled",
          type: "updateAttribute",
          value: "false",
        });
        return;
      }

      const shop = printShops.find(s => s.id.toString() === value);
      if (!shop) return;

      console.log('📦 Setting cart attributes for shop:', shop);

      // Update cart attributes with selected print shop
      await applyAttributeChange({
        key: "diy_label_enabled",
        type: "updateAttribute",
        value: "true",
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_id",
        type: "updateAttribute",
        value: shop.id.toString(),
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_name",
        type: "updateAttribute",
        value: shop.name,
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_address",
        type: "updateAttribute",
        value: shop.address,
      });

      // Store location info
      const locationInfo = {
        address: shippingAddress ? `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.provinceCode}` : '',
        coordinates: { lat: shop.lat, lng: shop.lng },
        pickupLocation: pickupLocations[0]?.address || null
      };

      await applyAttributeChange({
        key: "diy_label_customer_location",
        type: "updateAttribute",
        value: JSON.stringify(locationInfo),
      });

      console.log('📦 Cart attributes set successfully');

    } catch (error) {
      console.error('📦 Error updating cart attributes:', error);
      setError('Failed to update cart attributes. Please try again.');
    }
  };

  // Create DIY Label order
  const createDIYLabelOrder = async () => {
    if (!selectedPrintShop || orderCreating) return;

    const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
    if (!shop) {
      setError('Selected print shop not found');
      return;
    }

    try {
      setOrderCreating(true);
      setError('');
      
      const shopDomain = 'diy-label.myshopify.com';
      
      const orderData = {
        shopifyOrderId: `pickup-checkout-${Date.now()}`,
        shopDomain: shopDomain,
        printShopId: shop.id,
        productData: {
          line_items: cartLines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            title: line.merchandise.title || 'Unknown Product',
            variant_id: line.merchandise.id,
            price: line.cost?.totalAmount?.amount || 0,
            product_id: line.merchandise.product?.id || ''
          })),
          total: cartLines.reduce((sum, line) => sum + (line.cost?.totalAmount?.amount || 0), 0),
          currency: cartLines[0]?.cost?.totalAmount?.currencyCode || 'USD'
        },
        customerData: {
          name: [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(' ') || 'Pickup Customer',
          email: customer?.email || 'pickup-extension@placeholder.com',
          phone: customer?.phone || '',
          shipping_address: shippingAddress
        },
        options: {
          source: 'pickup_extension',
          pickupLocation: pickupLocations[0] || null
        }
      };

      const response = await fetch('https://diylabel.netlify.app/.netlify/functions/checkout-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setError('✅ Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('📦 Error creating DIY Label order:', error);
      setError(`Failed to create order: ${error.message}`);
    } finally {
      setOrderCreating(false);
    }
  };

  // Prepare select options
  const selectOptions = [
    { value: "", label: "Choose a print shop..." },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name}${shop.distance_km ? ` (${shop.distance_km.toFixed(1)}km)` : ''}`
    }))
  ];

  // Only show if we have cart items and pickup locations are available
  if (cartLines.length === 0) {
    console.log('📦 No cart items, not showing pickup extension');
    return null;
  }

  // Show if DIY Label is already enabled
  if (diyLabelEnabled && existingPrintShop) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🌱 Local Printing Selected</Text>
            <Text>
              Your order will be printed at {existingPrintShop} and ready for pickup.
            </Text>
          </BlockStack>
        </Banner>
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Local Printing Available</Text>
          <Text>
            Support your local community and reduce shipping impact by printing your items at a nearby shop for pickup.
          </Text>
        </BlockStack>
      </Banner>

      {error && (
        <Banner status={error.includes('✅') ? "success" : "critical"}>
          <Text>{error}</Text>
        </Banner>
      )}

      {loading && (
        <Text>Loading nearby print shops...</Text>
      )}

      {!loading && printShops.length > 0 && (
        <BlockStack spacing="base">
          <Text emphasis="bold">Select a Print Shop:</Text>
          
          <Select
            label="Local Partner Shop"
            value={selectedPrintShop}
            onChange={handlePrintShopChange}
            options={selectOptions}
          />

          {selectedPrintShop && (
            <BlockStack spacing="tight">
              {(() => {
                const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
                if (!shop) return null;

                return (
                  <>
                    <Banner status="success">
                      <BlockStack spacing="tight">
                        <Text emphasis="bold">{shop.name}</Text>
                        <Text>{shop.address}</Text>
                        <Text>Specialty: {shop.specialty}</Text>
                        <Text>Rating: ⭐ {shop.rating}/5</Text>
                        {shop.distance_km && (
                          <Text>Distance: {shop.distance_km.toFixed(1)} km</Text>
                        )}
                      </BlockStack>
                    </Banner>

                    <Button
                      kind="primary"
                      onPress={createDIYLabelOrder}
                      loading={orderCreating}
                    >
                      {orderCreating ? 'Creating Order...' : 'Confirm Local Printing'}
                    </Button>
                  </>
                );
              })()}
            </BlockStack>
          )}
        </BlockStack>
      )}

      {!loading && printShops.length === 0 && (
        <Banner status="warning">
          <Text>No print shops found in your area. Please try a different location.</Text>
        </Banner>
      )}
    </BlockStack>
  );
}