import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  Button,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  useCartLines,
  useAttributes,
  useShippingAddress,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect, useMemo } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

interface PrintShop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  specialty: string;
  rating: number;
  phone?: string;
  email?: string;
  active?: boolean;
  distance_km?: number;
}

function Extension() {
  const translate = useTranslate();
  const { extension, query } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const shippingAddress = useShippingAddress();

  // Debug logging on component mount
  useEffect(() => {
    console.log('🌱 DIY Label Extension: Component mounted');
    console.log('🌱 DIY Label Extension: Cart lines:', cartLines.length);
    console.log('🌱 DIY Label Extension: Shipping address:', shippingAddress);
    console.log('🌱 DIY Label Extension: Attributes:', attributes);
  }, []);

  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [selectedPrintShop, setSelectedPrintShop] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [orderCreated, setOrderCreated] = useState(false);

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShopName = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;
  const existingPrintShopAddress = attributes.find(attr => attr.key === 'diy_label_print_shop_address')?.value;

  // Check if cart has items (function only works with products in cart)
  const hasCartItems = cartLines.length > 0;

  // Debug logging for key states
  useEffect(() => {
    console.log('🌱 DIY Label Extension: State update', {
      diyLabelEnabled,
      existingPrintShopName,
      hasCartItems,
      printShopsCount: printShops.length,
      selectedPrintShop,
      loading,
      error
    });
  }, [diyLabelEnabled, existingPrintShopName, hasCartItems, printShops.length, selectedPrintShop, loading, error]);

  // Create a stable address string for comparison
  const addressString = useMemo(() => {
    if (!shippingAddress) return '';
    
    return [
      shippingAddress.address1,
      shippingAddress.city,
      shippingAddress.provinceCode,
      shippingAddress.countryCode,
      shippingAddress.zip
    ].filter(Boolean).join(', ');
  }, [shippingAddress]);

  // Get coordinates from address detection
  const getCoordinatesFromAddress = () => {
    if (!shippingAddress) return null;
    
    console.log('🌱 Getting coordinates from address:', shippingAddress);
    
    // Use shipping address city first, then province fallback
    if (shippingAddress.city) {
      const city = shippingAddress.city.toLowerCase();
      
      // Specific city detection
      if (city.includes('ottawa') || city.includes('downtown')) {
        console.log('🌱 Detected Ottawa from shipping city');
        return { lat: 45.4215, lng: -75.6972 };
      } else if (city.includes('montreal') || city.includes('ville-marie')) {
        console.log('🌱 Detected Montreal from shipping city');
        return { lat: 45.5017, lng: -73.5673 };
      } else if (city.includes('toronto')) {
        console.log('🌱 Detected Toronto from shipping city');
        return { lat: 43.6532, lng: -79.3832 };
      } else if (city.includes('vancouver')) {
        console.log('🌱 Detected Vancouver from shipping city');
        return { lat: 49.2827, lng: -123.1207 };
      } else if (city.includes('calgary')) {
        console.log('🌱 Detected Calgary from shipping city');
        return { lat: 51.0447, lng: -114.0719 };
      }
    }
    
    // Province fallback
    if (shippingAddress.provinceCode === 'QC' || shippingAddress.province === 'Quebec') {
      console.log('🌱 Province fallback: Quebec → Montreal');
      return { lat: 45.5017, lng: -73.5673 };
    } else if (shippingAddress.provinceCode === 'ON' || shippingAddress.province === 'Ontario') {
      console.log('🌱 Province fallback: Ontario → Ottawa');
      return { lat: 45.4215, lng: -75.6972 };
    } else if (shippingAddress.provinceCode === 'BC') {
      console.log('🌱 Province fallback: BC → Vancouver');
      return { lat: 49.2827, lng: -123.1207 };
    } else if (shippingAddress.provinceCode === 'AB') {
      console.log('🌱 Province fallback: AB → Calgary');
      return { lat: 51.0447, lng: -114.0719 };
    }
    
    // Final fallback to Ottawa
    console.log('🌱 Final fallback: Ottawa');
    return { lat: 45.4215, lng: -75.6972 };
  };

  // 2. Check instructions for feature availability
  if (!instructions.attributes.canUpdateAttributes) {
    console.log('🌱 DIY Label Extension: Attribute changes not supported');
    return (
      <Banner title="DIY Label" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  // Don't show if no cart items
  if (!hasCartItems) {
    console.log('🌱 DIY Label Extension: No cart items, not showing');
    return null;
  }

  // Fetch print shops based on coordinates
  const fetchPrintShops = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      setError("");
      
      const apiUrl = `https://diylabel.netlify.app/.netlify/functions/nearby-shops?lat=${lat}&lng=${lng}&radius=50`;
      
      console.log('Fetching print shops from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPrintShops(data.printShops || []);
      
      // Reset selected print shop when new shops are loaded
      setSelectedPrintShop("");
      
    } catch (err) {
      console.error('Error fetching print shops:', err);
      setError('Failed to load print shops. Please try again.');
      setPrintShops([]);
    } finally {
      setLoading(false);
    }
  };

  // Watch for address changes and fetch print shops
  useEffect(() => {
    const loadPrintShopsForAddress = async () => {
      console.log('🌱 DIY Label Extension: loadPrintShopsForAddress called', {
        hasShippingAddress: !!shippingAddress,
        hasCity: !!shippingAddress?.city,
        hasAddress1: !!shippingAddress?.address1,
        diyLabelEnabled,
        addressString,
        shippingAddressDetails: shippingAddress
      });

      // Get coordinates from address detection
      const coordinates = getCoordinatesFromAddress();
      
      if (coordinates) {
        console.log('🌱 Final coordinates for print shop search:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        console.log('🌱 No location data available, using emergency Ottawa fallback');
        await fetchPrintShops(45.4215, -75.6972);
      }
    };

    // Only load print shops if DIY Label is not already enabled
    if (!diyLabelEnabled) {
      console.log('🌱 DIY Label Extension: Loading print shops (DIY Label not yet enabled)');
      loadPrintShopsForAddress();
    } else {
      console.log('🌱 DIY Label Extension: DIY Label already enabled, skipping print shop loading');
    }
  }, [addressString, diyLabelEnabled, shippingAddress?.provinceCode, shippingAddress?.city]);

  // Handle print shop selection
  const handlePrintShopChange = async (value: string) => {
    console.log('🌱 DIY Label Extension: Print shop selection changed to:', value);
    setSelectedPrintShop(value);
    
    if (!value) return;

    const shop = printShops.find(s => s.id.toString() === value);
    if (!shop) return;

    console.log('🌱 DIY Label Extension: Setting cart attributes for shop:', shop);

    try {
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

      if (shippingAddress) {
        await applyAttributeChange({
          key: "diy_label_customer_location",
          type: "updateAttribute",
          value: JSON.stringify({
            address: addressString,
            coordinates: { lat: shop.lat, lng: shop.lng }
          }),
        });
      }

      console.log('🌱 DIY Label Extension: Cart attributes set successfully');

    } catch (error) {
      console.error('🌱 DIY Label Extension: Error setting cart attributes:', error);
      setError('Failed to select print shop. Please try again.');
    }
  };

  // Create DIY Label order
  const createDIYLabelOrder = async () => {
    if (!selectedPrintShop) {
      setError('Please select a print shop first');
      return;
    }

    const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
    if (!shop) {
      setError('Selected print shop not found');
      return;
    }

    try {
      setError('');
      console.log('Creating DIY Label order for shop:', shop);

      const shopDomain = 'diy-label.myshopify.com';
      
      const orderData = {
        shopifyOrderId: `checkout-${Date.now()}`,
        shopDomain: shopDomain,
        printShopId: shop.id,
        productData: {
          line_items: cartLines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            title: line.merchandise.title || 'Unknown Product',
            variant_id: line.merchandise.id
          })),
          total: cartLines.reduce((sum, line) => sum + (line.cost?.totalAmount?.amount || 0), 0),
          currency: cartLines[0]?.cost?.totalAmount?.currencyCode || 'USD'
        },
        customerData: {
          name: 'Checkout Extension Customer',
          email: 'checkout-extension@example.com',
          shipping_address: shippingAddress,
          customer_location: addressString
        },
        options: {
          source: 'checkout_extension'
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
        setOrderCreated(true);
        console.log('🌱 Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('🌱 Error creating DIY Label order:', error);
      setError(`Failed to create order: ${error.message}`);
    }
  };

  // Handle removal of DIY Label
  const handleRemoveDIYLabel = async () => {
    try {
      await applyAttributeChange({
        key: "diy_label_enabled",
        type: "updateAttribute",
        value: "false",
      });

      // Clear other DIY Label attributes
      await applyAttributeChange({
        key: "diy_label_print_shop_id",
        type: "updateAttribute",
        value: "",
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_name",
        type: "updateAttribute",
        value: "",
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_address",
        type: "updateAttribute",
        value: "",
      });

      await applyAttributeChange({
        key: "diy_label_customer_location",
        type: "updateAttribute",
        value: "",
      });

      setSelectedPrintShop("");
      setOrderCreated(false);
    } catch (error) {
      setError('Failed to remove local printing option');
    }
  };

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name}${shop.distance_km ? ` (${shop.distance_km.toFixed(1)}km)` : ''}`
    }))
  ];

  // Only render if shipping address has been entered
  if (!shippingAddress) {
    console.log('🌱 No shipping address available yet');
    return (
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            Please enter your shipping address to find nearby print shops.
          </Text>
        </BlockStack>
      </Banner>
    );
  }
  
  // More flexible address validation
  if (!shippingAddress.address1 && !shippingAddress.city) {
    console.log('🌱 No address1 or city available yet');
    return (
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            Please complete your shipping address to find nearby print shops.
          </Text>
        </BlockStack>
      </Banner>
    );
  }

  // If already enabled and order created, show success state
  if (diyLabelEnabled && existingPrintShopName && (orderCreated || selectedPrintShop)) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🌱 Local Printing Selected</Text>
            <Text>
              Your order will be printed at {existingPrintShopName} and ready for pickup. 
              This reduces shipping impact and supports your local community.
            </Text>
          </BlockStack>
        </Banner>
        
        {existingPrintShopAddress && (
          <Banner status="info">
            <BlockStack spacing="tight">
              <Text emphasis="bold">{existingPrintShopName}</Text>
              <Text>{existingPrintShopAddress}</Text>
              {(() => {
                const shop = printShops.find(s => s.name === existingPrintShopName);
                if (shop) {
                  return (
                    <>
                      <Text>Specialty: {shop.specialty}</Text>
                      <Text>Rating: ⭐ {shop.rating}/5</Text>
                      {shop.distance_km && (
                        <Text>Distance: {shop.distance_km.toFixed(1)} km</Text>
                      )}
                    </>
                  );
                }
                return null;
              })()}
            </BlockStack>
          </Banner>
        )}
        
        <Button
          kind="secondary"
          onPress={handleRemoveDIYLabel}
        >
          Remove Local Printing
        </Button>
      </BlockStack>
    );
  }

  // 3. Render the UI - this should not show since local-delivery.tsx and local-pick-up.tsx handle the main UI
  return null;
}