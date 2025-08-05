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
  useApi
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
  const { query } = useApi();
  const [selectedPrintShop, setSelectedPrintShop] = useState("");
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);

  // Get Shopify data
  const shippingAddress = useShippingAddress();
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  const customer = useCustomer();

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShopName = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;
  const existingPrintShopAddress = attributes.find(attr => attr.key === 'diy_label_print_shop_address')?.value;

  // Debug logging
  useEffect(() => {
    console.log('📦 Pickup Location Extension: Component mounted', {
      cartLines: cartLines.length,
      shippingAddress: !!shippingAddress,
      diyLabelEnabled,
      existingPrintShopName
    });
  }, []);

  // Get coordinates from Shopify data
  const getCoordinatesFromShopifyData = async () => {
    try {
      const result = await query(`
        query {
          locations {
            id
            name
            address {
              address1
              address2
              city
              provinceCode
              countryCode
              zip
              coordinates {
                latitude
                longitude
              }
            }
          }
        }
      `);

      console.log('📦 Shopify locations query result:', result);

      if (result?.data?.locations && result.data.locations.length > 0) {
        const location = result.data.locations[0];
        console.log('📦 Using Shopify location:', location);
        
        if (location.address?.coordinates) {
          console.log('📦 Found Shopify coordinates:', location.address.coordinates);
          return {
            lat: location.address.coordinates.latitude,
            lng: location.address.coordinates.longitude
          };
        }
      }
    } catch (error) {
      console.log('📦 Could not get Shopify location data:', error);
    }

    return null;
  };

  // Fallback location detection based on shipping address
  const getCoordinatesFromAddress = () => {
    if (!shippingAddress) return null;
    
    console.log('📦 Fallback: Using shipping address for coordinates:', shippingAddress);
    
    // Use shipping address city first, then province fallback
    if (shippingAddress.city) {
      const city = shippingAddress.city.toLowerCase();
      
      // Specific city detection
      if (city.includes('ottawa') || city.includes('downtown')) {
        console.log('📦 Detected Ottawa from shipping city');
        return { lat: 45.4215, lng: -75.6972 };
      } else if (city.includes('montreal') || city.includes('ville-marie')) {
        console.log('📦 Detected Montreal from shipping city');
        return { lat: 45.5017, lng: -73.5673 };
      } else if (city.includes('toronto')) {
        console.log('📦 Detected Toronto from shipping city');
        return { lat: 43.6532, lng: -79.3832 };
      } else if (city.includes('vancouver')) {
        console.log('📦 Detected Vancouver from shipping city');
        return { lat: 49.2827, lng: -123.1207 };
      } else if (city.includes('calgary')) {
        console.log('📦 Detected Calgary from shipping city');
        return { lat: 51.0447, lng: -114.0719 };
      }
    }
    
    // Province fallback
    if (shippingAddress.provinceCode === 'QC' || shippingAddress.province === 'Quebec') {
      console.log('📦 Province fallback: Quebec → Montreal');
      return { lat: 45.5017, lng: -73.5673 };
    } else if (shippingAddress.provinceCode === 'ON' || shippingAddress.province === 'Ontario') {
      console.log('📦 Province fallback: Ontario → Ottawa');
      return { lat: 45.4215, lng: -75.6972 };
    } else if (shippingAddress.provinceCode === 'BC') {
      console.log('📦 Province fallback: BC → Vancouver');
      return { lat: 49.2827, lng: -123.1207 };
    } else if (shippingAddress.provinceCode === 'AB') {
      console.log('📦 Province fallback: AB → Calgary');
      return { lat: 51.0447, lng: -114.0719 };
    }
    
    // Final fallback to Ottawa
    console.log('📦 Final fallback: Ottawa');
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
      console.log('📦 Loading print shops for pickup extension...');
      
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
      
      // PRIORITY 1: Try to get coordinates from Shopify's pickup locations
      let coordinates = await getCoordinatesFromShopifyData();
      
      // PRIORITY 2: Fallback to shipping address detection
      if (!coordinates) {
        console.log('📦 No Shopify location data, using shipping address');
        coordinates = getCoordinatesFromAddress();
      }
      
      if (coordinates) {
        console.log('📦 Final coordinates for print shop search:', coordinates);
        await fetchPrintShops(coordinates.lat, coordinates.lng);
      } else {
        console.log('📦 No coordinates available, using default Ottawa location');
        await fetchPrintShops(45.4215, -75.6972);
      }
    };

    loadPrintShops();
  }, [shippingAddress, diyLabelEnabled, cartLines.length, query]);

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
        setOrderCreated(false);
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
        coordinates: { lat: shop.lat, lng: shop.lng }
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
          source: 'pickup_extension'
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
        console.log('📦 Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('📦 Error creating DIY Label order:', error);
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

  // Only show if we have cart items
  if (cartLines.length === 0) {
    console.log('📦 No cart items, not showing pickup extension');
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

      {!loading && printShops.length === 0 && (
        <Banner status="warning">
          <Text>No print shops found in your area. Please try a different location.</Text>
        </Banner>
      )}
    </BlockStack>
  );
}