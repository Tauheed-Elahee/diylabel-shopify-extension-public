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

  // Create a stable address string for comparison
  const addressString = shippingAddress ? 
    `${shippingAddress.address1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.provinceCode || ''}, ${shippingAddress.countryCode || ''}, ${shippingAddress.zip || ''}`.trim() : '';

  // 2. Check instructions for feature availability
  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="DIY Label" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  // Don't show if no cart items
  if (!hasCartItems) {
    return null;
  }

  // Geocode address to get coordinates
  const geocodeAddress = async (address: any): Promise<{ lat: number; lng: number } | null> => {
    if (!address || !address.city || !address.provinceCode) {
      return null;
    }

    try {
      setGeocoding(true);
      
      const addressQuery = [
        address.address1,
        address.city,
        address.provinceCode,
        address.countryCode,
        address.zip
      ].filter(Boolean).join(', ');

      console.log('Geocoding address:', addressQuery);

      const response = await fetch(
        `https://diylabel.netlify.app/.netlify/functions/geocode?address=${encodeURIComponent(addressQuery)}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.lat && data.lng) {
        console.log('Geocoded successfully:', { lat: data.lat, lng: data.lng });
        return { lat: data.lat, lng: data.lng };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

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
      if (!shippingAddress || !shippingAddress.city) {
        // Clear print shops if no valid address
        setPrintShops([]);
        setSelectedPrintShop("");
        return;
      }

      console.log('Address changed, fetching print shops for:', addressString);

      // Try to geocode the address
      const coordinates = await geocodeAddress(shippingAddress);
      
      if (coordinates) {
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        // Fallback to a default location if geocoding fails
        console.log('Geocoding failed, using default Ottawa location');
        await fetchPrintShops(45.4215, -75.6972); // Ottawa coordinates
      }
    };

    // Only load print shops if DIY Label is not already enabled
    if (!diyLabelEnabled) {
      loadPrintShopsForAddress();
    }
  }, [addressString, diyLabelEnabled]); // Re-run when address string changes

  // Handle print shop selection
  const handlePrintShopChange = async (value: string) => {
    setSelectedPrintShop(value);
    
    if (!value) return;

    const shop = printShops.find(s => s.id.toString() === value);
    if (!shop) return;

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

    } catch (error) {
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
  if (!shippingAddress || !shippingAddress.address1) {
    return (
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            {translate("enterShippingAddress")}
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