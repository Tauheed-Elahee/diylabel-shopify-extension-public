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

  // Fetch print shops from Supabase
  useEffect(() => {
    const fetchPrintShops = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Use hardcoded print shops for now since API URL changes
        // Use environment variable for API URL, fallback to current tunnel for development
        const apiUrl = process.env.SHOPIFY_APP_URL || 'https://traveling-dash-investigator-startup.trycloudflare.com';
        
        const response = await fetch(
          `${apiUrl}/api/print-shops/nearby?lat=43.6532&lng=-79.3832&radius=50`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPrintShops(data.printShops || []);
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrintShops();
  }, []);

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

  // Check if Shipping Address has been entered
  const shippingAddress = useShippingAddress();

  // Check Delivery Option
  const deliveryGroups = useDeliveryGroups();
  const selectedOption = useDeliveryGroup(deliveryGroups[0])?.selectedDeliveryOption;

  // Only render your component if the address has been entered
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

      <>
        {selectedOption && selectedOption?.title === 'Local Delivery' && (
          <BlockStack spacing="base">
            <Text emphasis="bold">{translate("selectPrintShop")}</Text>
            
            {error && (
              <Banner status="critical">
                <Text>{error}</Text>
              </Banner>
            )}
            
            {loading && (
              <Text>Loading print shops...</Text>
            )}

            {!loading && !error && (
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
      </>
    </BlockStack>
  );
}
