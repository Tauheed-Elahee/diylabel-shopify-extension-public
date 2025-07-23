import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  Button,
  useTranslate,
  useShippingAddress,
  useDeliveryGroups,
  useDeliveryGroup,
  useCartLines,
  useAttributes,
  useApplyAttributeChange,
  useEmail,
  usePhone,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

export default reactExtension(
  "purchase.checkout.shipping-option-list.render-after",
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
  const [geocoding, setGeocoding] = useState(false);
  const [orderCreating, setOrderCreating] = useState(false);

  // Get shipping address and cart data from Shopify
  const shippingAddress = useShippingAddress();
  const deliveryGroups = useDeliveryGroups();
  const selectedOption = useDeliveryGroup(deliveryGroups[0])?.selectedDeliveryOption;
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  const email = useEmail();
  const phone = usePhone();

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Create a stable address string for comparison
  const addressString = shippingAddress ? 
    `${shippingAddress.address1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.provinceCode || ''}, ${shippingAddress.countryCode || ''}, ${shippingAddress.zip || ''}`.trim() : '';

  // Debug logging
  useEffect(() => {
    console.log('🚢 Local Delivery Extension: Component mounted', {
      cartLines: cartLines.length,
      shippingAddress: !!shippingAddress,
      diyLabelEnabled,
      existingPrintShop
    });
  }, []);

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

      console.log('🚢 Geocoding address:', addressQuery);

      const response = await fetch(
        `https://diylabel.netlify.app/.netlify/functions/geocode?address=${encodeURIComponent(addressQuery)}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.lat && data.lng) {
        console.log('🚢 Geocoded successfully:', { lat: data.lat, lng: data.lng });
        return { lat: data.lat, lng: data.lng };
      }

      return null;
    } catch (error) {
      console.error('🚢 Geocoding error:', error);
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
      
      console.log('🚢 Fetching print shops from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPrintShops(data.printShops || []);
      
      // Reset selected print shop when new shops are loaded
      setSelectedPrintShop("");
      
    } catch (err) {
      console.error('🚢 Error fetching print shops:', err);
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
      console.log('🚢 loadPrintShopsForAddress called', {
        hasShippingAddress: !!shippingAddress,
        hasCity: !!shippingAddress?.city,
        hasAddress1: !!shippingAddress?.address1,
        addressString,
        shippingAddressDetails: shippingAddress
      });

      if (!shippingAddress || !shippingAddress.city) {
        // Clear print shops if no valid address
        console.log('🚢 No valid address, clearing print shops');
        setPrintShops([]);
        setSelectedPrintShop("");
        return;
      }

      console.log('🚢 Address changed, fetching print shops for:', addressString);

      // Try to geocode the address
      const coordinates = await geocodeAddress(shippingAddress);
      
      if (coordinates) {
        console.log('🚢 Got coordinates, fetching print shops:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        // Fallback to a default location if geocoding fails
        console.log('🚢 Geocoding failed, using default Ottawa location');
        await fetchPrintShops(45.4215, -75.6972); // Ottawa coordinates
      }
    };

    console.log('🚢 useEffect triggered', { addressString, hasShippingAddress: !!shippingAddress });
    // Only load print shops if DIY Label is not already enabled
    if (!diyLabelEnabled) {
      loadPrintShopsForAddress();
    }
  }, [addressString, diyLabelEnabled]);

  // Update cart attributes when print shop selection changes
  const handlePrintShopChange = async (value: string) => {
    console.log('🚢 Print shop selection changed to:', value);
    setSelectedPrintShop(value);
    
    try {
      if (!value || value === "") {
        // Clear DIY Label attributes when "Choose a print shop..." is selected
        console.log('🚢 Clearing DIY Label attributes');
        await applyAttributeChange({
          key: "diy_label_enabled",
          type: "updateAttribute",
          value: "false",
        });
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
        return;
      }

      const shop = printShops.find(s => s.id.toString() === value);
      if (!shop) return;

      console.log('🚢 Setting cart attributes for shop:', shop);

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

      console.log('🚢 Cart attributes set successfully');

    } catch (error) {
      console.error('🚢 Error updating cart attributes:', error);
      setError('Failed to update cart attributes. Please try again.');
    }
  };

  // Create DIY Label order via Netlify endpoint
  const createDIYLabelOrder = async () => {
    console.log('🚢 createDIYLabelOrder called', {
      selectedPrintShop,
      orderCreating,
      printShopsLength: printShops.length
    });

    if (!selectedPrintShop || orderCreating) {
      console.log('🚢 Cannot create order:', { selectedPrintShop: !!selectedPrintShop, orderCreating });
      return;
    }

    const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
    if (!shop) {
      console.error('🚢 Selected print shop not found:', selectedPrintShop);
      setError('Selected print shop not found');
      return;
    }

    // Validate customer information before creating order
    const missingInfo = [];
    
    // Check customer contact info
    if (!email || email.trim().length === 0) {
      missingInfo.push('Email address');
    } else if (!email.includes('@')) {
      missingInfo.push('Valid email address');
    }
    
    // Check shipping address
    if (!shippingAddress?.address1) {
      missingInfo.push('Shipping address');
    }
    if (!shippingAddress?.city) {
      missingInfo.push('City');
    }
    if (!shippingAddress?.provinceCode) {
      missingInfo.push('Province/State');
    }
    if (!shippingAddress?.zip) {
      missingInfo.push('Postal/ZIP code');
    }
    
    // Check if we have a customer name from shipping address
    const customerName = [shippingAddress?.firstName, shippingAddress?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    
    if (!customerName || customerName.length < 2) {
      missingInfo.push('Customer name');
    }
    
    if (missingInfo.length > 0) {
      const missingText = missingInfo.join(', ');
      setError(`Missing shipping information: ${missingText}. Please complete all required fields before creating your DIY Label order.`);
      console.log('🚢 Missing customer information:', missingInfo);
      return;
    }

    try {
      setOrderCreating(true);
      setError('');
      console.log('🚢 Creating DIY Label order for shop:', shop);

      // Use a default shop domain since window is not available in checkout extensions
      const shopDomain = 'diy-label.myshopify.com';
      console.log('🚢 Using shop domain:', shopDomain);

      // Extract customer name from shipping address
      const fullName = customerName;
      
      // Prepare order data
      const orderData = {
        shopifyOrderId: `delivery-checkout-${Date.now()}`,
        shopDomain: shopDomain,
        printShopId: shop.id,
        productData: {
          line_items: cartLines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            title: line.merchandise.__typename === 'ProductVariant' ? 
                   line.merchandise.product?.title || 'Unknown Product' : 'Unknown Product',
            variant_id: line.merchandise.id,
            variant_title: line.merchandise.__typename === 'ProductVariant' ? 
                          line.merchandise.title || '' : '',
            price: line.cost?.totalAmount?.amount || 0,
            product_id: line.merchandise.__typename === 'ProductVariant' ? 
                       line.merchandise.product?.id || '' : ''
          })),
          total: cartLines.reduce((sum, line) => sum + (line.cost?.totalAmount?.amount || 0), 0),
          currency: cartLines[0]?.cost?.totalAmount?.currencyCode || 'USD',
          item_count: cartLines.reduce((sum, line) => sum + line.quantity, 0)
        },
        customerData: {
          name: fullName,
          email: email || '',
          phone: phone || '',
          shipping_address: shippingAddress,
          customer_location: addressString,
          customer_id: null
        },
        options: {
          source: 'delivery_extension',
          extension_version: '1.0',
          print_shop_selection: shop,
          user_agent: 'delivery-checkout-extension',
          created_at: new Date().toISOString(),
          shipping_address: shippingAddress,
          customer_info: {
            name: fullName,
            email: email,
            phone: phone
          }
        }
      };

      console.log('🚢 Sending order data:', orderData);

      const response = await fetch('https://diylabel.netlify.app/.netlify/functions/checkout-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      console.log('🚢 Response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚢 API error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🚢 DIY Label order created successfully:', result);
      
      if (result.success) {
        setError('✅ Order created successfully!');
        console.log('🚢 Success: Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('🚢 Error creating DIY Label order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to create order: ${errorMessage}`);
    } finally {
      setOrderCreating(false);
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
  if (!shippingAddress || !shippingAddress.address1) {
    return null;
  }

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

      <BlockStack spacing="base">
        <Text emphasis="bold">{translate("selectPrintShop")}</Text>
        
        {geocoding && (
          <Banner status="info">
            <Text>📍 Finding print shops near your address...</Text>
          </Banner>
        )}
        
        {error && (
          <Banner status={error.includes('✅') ? "success" : "critical"}>
            <Text>{error}</Text>
          </Banner>
        )}
        
        {loading && !geocoding && (
          <Text>Loading print shops...</Text>
        )}

        {!loading && !geocoding && !error && printShops.length === 0 && shippingAddress.city && (
          <Banner status="warning">
            <Text>No print shops found near {shippingAddress.city}, {shippingAddress.provinceCode}. Please try a different address.</Text>
          </Banner>
        )}

        {!loading && !geocoding && printShops.length > 0 && (
          <Select
            label="Local Partner Shop"
            value={selectedPrintShop}
            onChange={handlePrintShopChange}
            options={selectOptions}
          />
        )}

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
                    {orderCreating ? 'Creating Order...' : 'Create DIY Label Order'}
                  </Button>
                </>
              );
            })()}
          </BlockStack>
        )}
      </BlockStack>
    </BlockStack>
  );
}