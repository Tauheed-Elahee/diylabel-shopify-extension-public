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
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

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
  distance_km?: number;
  phone?: string;
  email?: string;
}

interface PrintShopResponse {
  printShops: PrintShop[];
  center: { lat: number; lng: number };
  radius: number;
  count: number;
}

function Extension() {
  const translate = useTranslate();
  const { extension, query } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const cartLines = useCartLines();
  const attributes = useAttributes();

  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [selectedPrintShop, setSelectedPrintShop] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Check if cart has items (function only works with products in cart)
  const hasCartItems = cartLines.length > 0;

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

  // Get user location
  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Location access denied or unavailable'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  // Fetch print shops from API
  const fetchPrintShops = async (location: { lat: number; lng: number }) => {
    try {
      setLoading(true);
      setError("");

      // Get shop domain from checkout context
      const shopDomain = window.location.hostname;
      
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: '25'
      });

      const response = await fetch(`/api/print-shops/nearby?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch print shops');
      }

      const data: PrintShopResponse = await response.json();
      setPrintShops(data.printShops || []);
      
      if (data.printShops.length === 0) {
        setError('No print shops found within 25 miles of your location');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load print shops');
      setPrintShops([]);
    } finally {
      setLoading(false);
    }
  };

  // Load print shops on component mount
  useEffect(() => {
    const loadPrintShops = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        await fetchPrintShops(location);
      } catch (err) {
        setError('Please allow location access to find nearby print shops');
      }
    };

    // Only load if not already enabled
    if (!diyLabelEnabled) {
      loadPrintShops();
    }
  }, [diyLabelEnabled]);

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

      if (userLocation) {
        await applyAttributeChange({
          key: "diy_label_customer_location",
          type: "updateAttribute",
          value: JSON.stringify(userLocation),
        });
      }

      // Set the fulfillment type to trigger the pickup function
      await applyAttributeChange({
        key: "requestedFulfillmentType",
        type: "updateAttribute",
        value: "pickup",
      });

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

      await applyAttributeChange({
        key: "requestedFulfillmentType",
        type: "updateAttribute",
        value: "",
      });

      setSelectedPrintShop("");
    } catch (error) {
      setError('Failed to remove local printing option');
    }
  };

  // Prepare select options
  const selectOptions = [
    { value: "", label: "Choose a print shop..." },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name} - ${shop.address} ${shop.distance_km ? `(${shop.distance_km.toFixed(1)} km)` : ''}`
    }))
  ];

  // If already enabled, show current selection
  if (diyLabelEnabled && existingPrintShop) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🌱 Local Printing Selected</Text>
            <Text>
              Your order will be printed at {existingPrintShop} and ready for pickup.
              This reduces shipping impact and supports your local community.
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

  // 3. Render the UI
  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Local Printing Available</Text>
          <Text>
            Support your local community and reduce shipping impact by 
            printing your items at a nearby shop for pickup.
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

      {!loading && !error && printShops.length > 0 && (
        <BlockStack spacing="base">
          <Text emphasis="bold">Select a Print Shop:</Text>
          
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
                    <Text emphasis="bold">{shop.name}</Text>
                    <Text>{shop.address}</Text>
                    <Text>Specialty: {shop.specialty}</Text>
                    <Text>Rating: ⭐ {shop.rating}/5</Text>
                    {shop.distance_km && (
                      <Text>Distance: {shop.distance_km.toFixed(1)} km</Text>
                    )}
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