import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  useDeliveryGroups,
  useApi,
  useTranslate
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

export default reactExtension(
  "purchase.checkout.shipping-option-list.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
  const deliveryGroups = useDeliveryGroups();
  const { query } = useApi();
  const [selectedPrintShop, setSelectedPrintShop] = useState("");
  const [isLocalDeliverySelected, setIsLocalDeliverySelected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hardcoded print shop data
  const printShops = [
    { id: "1", name: "Toronto Print Hub", address: "123 Queen St W, Toronto, ON" },
    { id: "2", name: "King Street Printing", address: "456 King St W, Toronto, ON" },
    { id: "3", name: "Distillery Print Co.", address: "789 Front St E, Toronto, ON" },
    { id: "4", name: "Impression Montréal", address: "321 Rue Saint-Denis, Montréal, QC" },
    { id: "5", name: "Plateau Print Shop", address: "654 Avenue du Mont-Royal, Montréal, QC" },
    { id: "6", name: "Granville Print Co.", address: "258 Granville St, Vancouver, BC" },
    { id: "7", name: "Gastown Printing", address: "369 Water St, Vancouver, BC" },
    { id: "8", name: "Commercial Drive Print", address: "741 Commercial Dr, Vancouver, BC" },
    { id: "9", name: "Kitsilano Print Studio", address: "852 4th Ave W, Vancouver, BC" },
    { id: "10", name: "Stampede Print Co.", address: "123 17th Ave SW, Calgary, AB" }
  ];

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id,
      label: shop.name
    }))
  ];

  // Check if shipping address has been entered
  const hasShippingAddress = deliveryGroups.length > 0 && 
                            deliveryGroups[0]?.deliveryAddress !== undefined;

  // Check for selected delivery method
  useEffect(() => {
    if (!hasShippingAddress) {
      setLoading(false);
      return;
    }

    const checkDeliveryMethod = async () => {
      try {
        setLoading(true);
        const result = await query(`
          query {
            deliveryGroups {
              selectedDeliveryOption {
                handle
                title
              }
            }
          }
        `);

        const selectedOption = result?.data?.deliveryGroups?.[0]?.selectedDeliveryOption;
        
        // Check if local delivery is selected
        const isLocal = selectedOption && 
          (selectedOption.handle?.includes('local') || 
           selectedOption.title?.toLowerCase().includes('local'));
        
        setIsLocalDeliverySelected(!!isLocal);
      } catch (error) {
        console.error('Error checking delivery method:', error);
      } finally {
        setLoading(false);
      }
    };

    checkDeliveryMethod();
  }, [hasShippingAddress, query, deliveryGroups]);

  const handlePrintShopChange = (value: string) => {
    setSelectedPrintShop(value);
  };

  // If no shipping address or loading, don't show the component
  if (!hasShippingAddress || loading) {
    return null;
  }

  // Always show the banner
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

      {/* Only show print shop selection if local delivery is selected */}
      {isLocalDeliverySelected && (
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
                const shop = printShops.find(s => s.id === selectedPrintShop);
                if (!shop) return null;
                
                return (
                  <>
                    <Text emphasis="bold">{shop.name}</Text>
                    <Text>{shop.address}</Text>
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