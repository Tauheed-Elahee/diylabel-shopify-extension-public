import {
  reactExtension,
          {selectedPrintShop && (
            <BlockStack spacing="tight">
              {(() => {
                const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
                if (!shop) return null;
  useTranslate,
                return (
                  <>
                    <Banner status="success">
                      <BlockStack spacing="tight">
                        <Text emphasis="bold">{shop.name} ⭐ {shop.rating}/5</Text>
                        <Text>{shop.address}</Text>
                        <Text>Specialty: {shop.specialty}</Text>
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
  rating: number;
  distance_km?: number;
}

function Extension() {
  const translate = useTranslate();
  const applyAttributeChange = useApplyAttributeChange();
  const attributes = useAttributes();
  const cartLines = useCartLines();
  const [selectedPrintShop, setSelectedPrintShop] = useState("");
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [orderCreating, setOrderCreating] = useState(false);

  // Get shipping address from Shopify
  const shippingAddress = useShippingAddress();

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Debug logging
  useEffect(() => {
    console.log('🌱 DIY Label Local Delivery Extension: Component mounted');
    console.log('🌱 DIY Label Extension: Cart lines:', cartLines.length);
    console.log('🌱 DIY Label Extension: Shipping address:', shippingAddress);
    console.log('🌱 DIY Label Extension: Attributes:', attributes);
    console.log('🌱 DIY Label Extension: DIY Label enabled:', diyLabelEnabled);
  }, []);

  // Create a stable address string for comparison
  const addressString = shippingAddress ? 
    `${shippingAddress.address1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.provinceCode || ''}, ${shippingAddress.countryCode || ''}, ${shippingAddress.zip || ''}`.trim() : '';

  // Debug state changes
  useEffect(() => {
    console.log('🌱 DIY Label Extension: State update', {
      diyLabelEnabled,
      existingPrintShop,
      printShopsCount: printShops.length,
      selectedPrintShop,
      loading,
      error
    });
  }, [diyLabelEnabled, existingPrintShop, printShops.length, selectedPrintShop, loading, error]);

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
      if (!shippingAddress || !shippingAddress.city || diyLabelEnabled) {
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

    loadPrintShopsForAddress();
  }, [addressString, diyLabelEnabled]); // Re-run when address string changes

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

  // Handle removal of DIY Label
  const handleRemoveDIYLabel = async () => {
    console.log('🌱 DIY Label Extension: Removing DIY Label selection');
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
      console.log('🌱 DIY Label Extension: DIY Label removed successfully');
    } catch (error) {
      console.error('🌱 DIY Label Extension: Error removing DIY Label:', error);
      setError('Failed to remove local printing option');
    }
  };

  // Create order in Supabase
  const createDIYLabelOrder = async () => {
    console.log('🌱 DIY Label Extension: createDIYLabelOrder called');

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
      setError('');
      console.log('🌱 DIY Label Extension: Creating DIY Label order for shop:', shop);

      // Prepare order data
      const orderData = {
        shopifyOrderId: `checkout-${Date.now()}`,
        shopDomain: 'diy-label.myshopify.com',
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
          source: 'checkout_extension_local_delivery',
          extension_version: '1.0',
          print_shop_selection: shop,
          created_at: new Date().toISOString()
        }
      };

      console.log('🌱 DIY Label Extension: Sending order data:', orderData);

      const response = await fetch('https://diylabel.netlify.app/.netlify/functions/checkout-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      console.log('🌱 DIY Label Extension: API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌱 DIY Label Extension: API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('🌱 DIY Label Extension: Order created successfully:', result);

      if (result.success) {
        console.log('🌱 DIY Label Extension: Order creation confirmed');
        // Show success in UI
        setError('✅ Order created successfully!');
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error) {
      console.error('🌱 DIY Label Extension: Error creating order:', error);
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

  // If already enabled, show current selection
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
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            {translate("supportLocalCommunity")}
          </Text>
        </BlockStack>
      </Banner>

      {selectedOption && selectedOption?.title === 'Local Delivery' && (
        <BlockStack spacing="base">
          <Text emphasis="bold">{translate("selectPrintShop")}</Text>
          
          {geocoding && (
            <Banner status="info">
              <Text>📍 Finding print shops near your address...</Text>
        <Banner status={error.includes('✅') ? "success" : "critical"}>
          )}
          
          {error && (
            <Banner status="critical">
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

          {!loading && !geocoding && !error && printShops.length > 0 && (
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
                  </>
                );
              })()}
            </BlockStack>
          )}
        </BlockStack>
      )}
    </BlockStack>
      {!loading && !geocoding && printShops.length > 0 && (
        <BlockStack spacing="base">
          <Text emphasis="bold">{translate("selectPrintShop")}</Text>
          