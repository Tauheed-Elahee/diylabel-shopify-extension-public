import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  useTranslate,
  useShippingAddress,
  useDeliveryGroups,
  useDeliveryGroup,
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

  // Get shipping address from Shopify
  const shippingAddress = useShippingAddress();
  const deliveryGroups = useDeliveryGroups();
  const selectedOption = useDeliveryGroup(deliveryGroups[0])?.selectedDeliveryOption;

  // Create a stable address string for comparison
  const addressString = shippingAddress ? 
    `${shippingAddress.address1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.provinceCode || ''}, ${shippingAddress.countryCode || ''}, ${shippingAddress.zip || ''}`.trim() : '';

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

    loadPrintShopsForAddress();
  }, [addressString]); // Re-run when address string changes

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name}${shop.distance_km ? ` (${shop.distance_km.toFixed(1)}km)` : ''}`
    }))
  ];

  const handlePrintShopChange = (value: string) => {
    setSelectedPrintShop(value);
  };

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

      {selectedOption && selectedOption?.title === 'Local Delivery' && (
        <BlockStack spacing="base">
          <Text emphasis="bold">{translate("selectPrintShop")}</Text>
          
          {geocoding && (
            <Banner status="info">
              <Text>📍 Finding print shops near your address...</Text>
            </Banner>
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
  );
}