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
  const [orderCreated, setOrderCreated] = useState(false);

  // Get shipping address and cart data from Shopify
  const shippingAddress = useShippingAddress();
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  const customer = useCustomer();

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShopName = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;
  const existingPrintShopAddress = attributes.find(attr => attr.key === 'diy_label_print_shop_address')?.value;

  // Create a stable address string for comparison
  const addressString = shippingAddress ? 
    `${shippingAddress.address1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.provinceCode || ''}, ${shippingAddress.countryCode || ''}, ${shippingAddress.zip || ''}`.trim() : '';

  // Debug logging
  useEffect(() => {
    console.log('🚢 Local Delivery Extension: Component mounted', {
      cartLines: cartLines.length,
      shippingAddress: !!shippingAddress,
      diyLabelEnabled,
      existingPrintShopName
    });
  }, []);

  // Get coordinates based on province/city detection
  const getCoordinatesFromAddress = () => {
    if (!shippingAddress) return null;
    
    console.log('🚢 Getting coordinates from address:', shippingAddress);
    
    // Use shipping address city first, then province fallback
    if (shippingAddress.city) {
      const city = shippingAddress.city.toLowerCase();
      
      // Specific city detection
      if (city.includes('ottawa') || city.includes('downtown')) {
        console.log('🚢 Detected Ottawa from shipping city');
        return { lat: 45.4215, lng: -75.6972 };
      } else if (city.includes('montreal') || city.includes('ville-marie')) {
        console.log('🚢 Detected Montreal from shipping city');
        return { lat: 45.5017, lng: -73.5673 };
      } else if (city.includes('toronto')) {
        console.log('🚢 Detected Toronto from shipping city');
        return { lat: 43.6532, lng: -79.3832 };
      } else if (city.includes('vancouver')) {
        console.log('🚢 Detected Vancouver from shipping city');
        return { lat: 49.2827, lng: -123.1207 };
      } else if (city.includes('calgary')) {
        console.log('🚢 Detected Calgary from shipping city');
        return { lat: 51.0447, lng: -114.0719 };
      }
    }
    
    // Province fallback
    if (shippingAddress.provinceCode === 'QC' || shippingAddress.province === 'Quebec') {
      console.log('🚢 Province fallback: Quebec → Montreal');
      return { lat: 45.5017, lng: -73.5673 };
    } else if (shippingAddress.provinceCode === 'ON' || shippingAddress.province === 'Ontario') {
      console.log('🚢 Province fallback: Ontario → Ottawa');
      return { lat: 45.4215, lng: -75.6972 };
    } else if (shippingAddress.provinceCode === 'BC') {
      console.log('🚢 Province fallback: BC → Vancouver');
      return { lat: 49.2827, lng: -123.1207 };
    } else if (shippingAddress.provinceCode === 'AB') {
      console.log('🚢 Province fallback: AB → Calgary');
      return { lat: 51.0447, lng: -114.0719 };
    }
    
    // Final fallback to Ottawa
    console.log('🚢 Final fallback: Ottawa');
    return { lat: 45.4215, lng: -75.6972 };
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
      setPrintShops([]);
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

      if (!shippingAddress || (!shippingAddress.city && !shippingAddress.address1)) {
        console.log('🚢 No valid address, clearing print shops');
        setPrintShops([]);
        setSelectedPrintShop("");
        return;
      }

      console.log('🚢 Address changed, fetching print shops for:', addressString);

      // Get coordinates from address detection
      const coordinates = getCoordinatesFromAddress();
      
      if (coordinates) {
        console.log('🚢 Got coordinates, fetching print shops:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        console.log('🚢 No coordinates available, using default Ottawa');
        await fetchPrintShops(45.4215, -75.6972);
      }
    };

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
        setOrderCreated(false);
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
      console.log('🚢 Creating DIY Label order for shop:', shop);

      const shopDomain = 'diy-label.myshopify.com';
      
      const orderData = {
        shopifyOrderId: `delivery-checkout-${Date.now()}`,
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
          name: [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(' ') || 'Delivery Customer',
          email: customer?.email || 'delivery-extension@placeholder.com',
          phone: customer?.phone || '',
          shipping_address: shippingAddress
        },
        options: {
          source: 'delivery_extension'
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
        console.log('🚢 Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('🚢 Error creating DIY Label order:', error);
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
    { value: "", label: "Choose a print shop..." },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name}${shop.distance_km ? ` (${shop.distance_km.toFixed(1)}km)` : ''}`
    }))
  ];

  // Only render if shipping address has been entered
  if (!shippingAddress || (!shippingAddress.city && !shippingAddress.address1)) {
    return null;
  }

  // Only show if we have cart items
  if (cartLines.length === 0) {
    return null;
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
        <Banner status="critical">
          <Text>{error}</Text>
        </Banner>
      )}
      
      {loading && (
        <Text>Loading print shops...</Text>
      )}

      {!loading && printShops.length === 0 && (shippingAddress.city || shippingAddress.address1) && (
        <Banner status="warning">
          <Text>No print shops found near {shippingAddress.city || shippingAddress.address1}, {shippingAddress.provinceCode}. Please try a different address.</Text>
        </Banner>
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
                    <Banner status="info">
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
                    >
                      Create DIY Label Order
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