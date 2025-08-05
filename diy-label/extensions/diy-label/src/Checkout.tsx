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
  useBuyerIdentity,
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
  const buyerIdentity = useBuyerIdentity();

  // Debug logging on component mount
  useEffect(() => {
    console.log('🌱 DIY Label Extension: Component mounted');
    console.log('🌱 DIY Label Extension: Cart lines:', cartLines.length);
    console.log('🌱 DIY Label Extension: Shipping address:', shippingAddress);
    console.log('🌱 DIY Label Extension: Attributes:', attributes);
    console.log('🌱 DIY Label Extension: Buyer identity:', buyerIdentity);
  }, []);

  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [selectedPrintShop, setSelectedPrintShop] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string>("");
  const [orderCreating, setOrderCreating] = useState(false);

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Check if cart has items (function only works with products in cart)
  const hasCartItems = cartLines.length > 0;

  // Debug logging for key states
  useEffect(() => {
    console.log('🌱 DIY Label Extension: State update', {
      diyLabelEnabled,
      existingPrintShop,
      hasCartItems,
      printShopsCount: printShops.length,
      selectedPrintShop,
      loading,
      error
    });
  }, [diyLabelEnabled, existingPrintShop, hasCartItems, printShops.length, selectedPrintShop, loading, error]);

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

  // Get coordinates from Shopify location data
  const getCoordinatesFromShopifyData = async () => {
    try {
      // Try to get location data from Shopify's API
      const result = await query(`
        query {
          locations {
            id
            name
            address {
              address1
              city
              provinceCode
              countryCode
              coordinates {
                latitude
                longitude
              }
            }
          }
        }
      `);

      console.log('🌱 Shopify locations query result:', result);

      if (result?.data?.locations && result.data.locations.length > 0) {
        // Find the closest location or use the first one
        const location = result.data.locations[0];
        if (location.address?.coordinates) {
          return {
            lat: location.address.coordinates.latitude,
            lng: location.address.coordinates.longitude
          };
        }
      }
    } catch (error) {
      console.log('🌱 Could not get Shopify location data:', error);
    }

    return null;
  };

  // Smart location detection without geocoding
  const getCoordinatesFromAddress = () => {
    if (!shippingAddress) return null;
    
    console.log('🌱 Using shipping address for coordinates:', shippingAddress);
    
    // Use province and city to determine coordinates
    if (shippingAddress.provinceCode === 'QC' || shippingAddress.province === 'Quebec') {
      if (shippingAddress.city?.toLowerCase().includes('montreal') || 
          shippingAddress.city?.toLowerCase().includes('ville-marie')) {
        console.log('🌱 Detected Montreal from shipping address');
        return { lat: 45.5017, lng: -73.5673 };
      } else if (shippingAddress.city?.toLowerCase().includes('quebec')) {
        return { lat: 46.8139, lng: -71.208 };
      } else {
        // Default to Montreal for Quebec addresses
        return { lat: 45.5017, lng: -73.5673 };
      }
    } else if (shippingAddress.provinceCode === 'ON' || shippingAddress.province === 'Ontario') {
      if (shippingAddress.city?.toLowerCase().includes('toronto')) {
        return { lat: 43.6532, lng: -79.3832 };
      } else if (shippingAddress.city?.toLowerCase().includes('ottawa')) {
        return { lat: 45.4215, lng: -75.6972 };
      } else {
        // Default to Toronto for Ontario addresses
        return { lat: 43.6532, lng: -79.3832 };
      }
    } else if (shippingAddress.provinceCode === 'BC') {
      return { lat: 49.2827, lng: -123.1207 }; // Vancouver
    } else if (shippingAddress.provinceCode === 'AB') {
      return { lat: 51.0447, lng: -114.0719 }; // Calgary
    }
    
    // Default to Ottawa
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
      
      // Fallback to mock data for development
      const fallbackShops = [
        { id: 10, name: "Capital Print Co.", address: "123 Bank St, Ottawa, ON", specialty: "Government Printing", rating: 4.8, distance_km: 2.1 },
        { id: 11, name: "ByWard Print Solutions", address: "456 Somerset St, Ottawa, ON", specialty: "Custom Designs", rating: 4.9, distance_km: 3.2 },
        { id: 12, name: "Rideau Print Centre", address: "321 Rideau St, Ottawa, ON", specialty: "Quick Service", rating: 4.5, distance_km: 1.8 }
      ];
      setPrintShops(fallbackShops);
      setSelectedPrintShop("");
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

      // Try to get coordinates from Shopify data first
      let coordinates = await getCoordinatesFromShopifyData();
      
      // Fallback to address-based detection
      if (!coordinates) {
        coordinates = getCoordinatesFromAddress();
      }
      
      // Final fallback to Ottawa if no address data
      if (coordinates) {
        console.log('🌱 Using coordinates:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        console.log('🌱 No location data available, using default Ottawa');
        await fetchPrintShops(45.4215, -75.6972);
      }
    };

    // Only load print shops if DIY Label is not already enabled
    if (!diyLabelEnabled) {
      console.log('🌱 DIY Label Extension: DIY Label not enabled, loading print shops');
      loadPrintShopsForAddress();
    } else {
      console.log('🌱 DIY Label Extension: DIY Label already enabled, skipping print shop loading');
    }
  }, [addressString, diyLabelEnabled, shippingAddress?.provinceCode, shippingAddress?.city, query]);

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
            coordinates: { lat: shop.lat, lng: shop.lng } // Use shop coordinates as approximation
          }),
        });
      }

      console.log('🌱 DIY Label Extension: Cart attributes set successfully');

    } catch (error) {
      console.error('🌱 DIY Label Extension: Error setting cart attributes:', error);
      setError('Failed to select print shop. Please try again.');
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
    } catch (error) {
      setError('Failed to remove local printing option');
    }
  };

  // Create order in Supabase when checkout is completed
  const createDIYLabelOrder = async () => {
    console.log('🌱 DIY Label Extension: createDIYLabelOrder called', {
      selectedPrintShop,
      orderCreating,
      printShopsLength: printShops.length
    });

    if (!selectedPrintShop || orderCreating) {
      console.log('Cannot create order:', { selectedPrintShop: !!selectedPrintShop, orderCreating });
      return;
    }

    const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
    if (!shop) {
      console.error('Selected print shop not found:', selectedPrintShop);
      setError('Selected print shop not found');
      return;
    }

    try {
      setOrderCreating(true);
      setError(''); // Clear any previous errors
      console.log('Creating DIY Label order for shop:', shop);

      // Extract shop domain from current URL or use default
      const currentUrl = window.location?.hostname || 'diy-label.myshopify.com';
      const shopDomain = currentUrl.includes('.myshopify.com') ? currentUrl : 'diy-label.myshopify.com';
      console.log('🌱 DIY Label Extension: Using shop domain:', shopDomain);

      // Prepare order data
      const orderData = {
        shopifyOrderId: `checkout-${Date.now()}`, // Temporary ID, will be updated by webhook
        shopDomain: shopDomain,
        printShopId: shop.id,
        productData: {
          line_items: cartLines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            title: line.merchandise.__typename === 'ProductVariant' ? 
                   line.merchandise.product?.title || 'Unknown Product' : 'Unknown Product',
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
          source: 'checkout_extension',
          extension_version: '1.0',
          print_shop_selection: shop,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        }
      };

      console.log('Sending order data:', orderData);

      // Try multiple API endpoints for reliability
      const apiEndpoints = [
        'https://diylabel.netlify.app/.netlify/functions/checkout-order',
        'https://diylabel.netlify.app/api/checkout/diy-label'
      ];
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
          });
          
          console.log('Response from', endpoint, ':', response.status, response.statusText);
          
          if (response.ok) {
            break; // Success, exit loop
          } else {
            const errorText = await response.text();
            console.error('API error from', endpoint, ':', errorText);
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          }
        } catch (fetchError) {
          console.error('Fetch error for', endpoint, ':', fetchError);
          lastError = fetchError;
          response = null;
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All API endpoints failed');
      }
      
      const result = await response.json();
      console.log('DIY Label order created successfully:', result);
      
      if (result.success) {
        // Show success message
        setError(''); // Clear any previous errors
        
        // Update the UI to show success
        const successMessage = `✅ Order created successfully!\n\nOrder ID: ${result.order.id}\nPrint Shop: ${result.order.printShop}\nStatus: ${result.order.status}`;
        
        // You could show this in the UI instead of alert
        console.log('Success:', successMessage);
        
        // Optionally update the status display
        // setError('Order created successfully! ✅');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('Error creating DIY Label order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to create order: ${errorMessage}`);
      
      // Show user-friendly error
      console.error('User-facing error:', errorMessage);
    } finally {
      setOrderCreating(false);
    }
  };

  // Test function to verify API connectivity
  const testAPIConnectivity = async () => {
    try {
      console.log('Testing API connectivity...');
      const response = await fetch('https://diylabel.netlify.app/.netlify/functions/nearby-shops?lat=43.6532&lng=-79.3832&radius=25');
      const data = await response.json();
      console.log('API test successful:', data);
      return true;
    } catch (error) {
      console.error('API test failed:', error);
      return false;
    }
  };

  // Test API connectivity on component mount
  useEffect(() => {
    testAPIConnectivity();
  }, []);

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name}${shop.distance_km ? ` (${shop.distance_km.toFixed(1)}km)` : ''}`
    }))
  ];

  // If already enabled, show current selection
  if (diyLabelEnabled && existingPrintShop) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🌱 {translate("localPrintingSelected")}</Text>
            <Text>
              {translate("orderWillBePrinted", { printShop: existingPrintShop })}
            </Text>
          </BlockStack>
        </Banner>
        
        <Button
          kind="secondary"
          onPress={handleRemoveDIYLabel}
        >
          {translate("removeLocalPrinting")}
        </Button>
      </BlockStack>
    );
  }

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

  // 3. Render the UI
  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            {translate("supportLocalCommunity")}
          </Text>
        </BlockStack>
      </Banner>

      {geocoding && (
        <Banner status="info">
          <Text>📍 {translate("usingCheckoutAddress")}</Text>
        </Banner>
      )}

      {error && (
        <Banner status="critical">
          <Text>{error}</Text>
        </Banner>
      )}

      {loading && !geocoding && (
        <Text>{translate("loadingPrintShops")}</Text>
      )}

      {!loading && !geocoding && !error && printShops.length === 0 && shippingAddress.city && (
        <Banner status="warning">
          <Text>No print shops found near {shippingAddress.city}, {shippingAddress.provinceCode}. Please try a different address.</Text>
        </Banner>
      )}

      {!loading && !geocoding && !error && printShops.length > 0 && (
        <BlockStack spacing="base">
          <Text emphasis="bold">{translate("selectPrintShop")}</Text>
          
          <Select
            label="Print Shop"
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
                        <Text emphasis="bold">{shop.name} ⭐ {shop.rating}/5</Text>
                        <Text>{shop.address}</Text>
                        <Text>{shop.specialty}</Text>
                        {shop.distance_km && (
                          <Text>Distance: {shop.distance_km.toFixed(1)} km</Text>
                        )}
                        {shop.phone && (
                          <Text>Phone: {shop.phone}</Text>
                        )}
                        {shop.email && (
                          <Text>Email: {shop.email}</Text>
                        )}
                      </BlockStack>
                    </Banner>

                    <Button
                      kind="primary"
                      onPress={createDIYLabelOrder}
                      loading={orderCreating}
                    >
                      {orderCreating ? 'Processing...' : 'Confirm Local Printing'}
                    </Button>
                  </>
                );
              })()}
            </BlockStack>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}