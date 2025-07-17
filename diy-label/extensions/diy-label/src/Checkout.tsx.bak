import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  Button,
  useApi,
  useDeliveryGroups,
  useTranslate,
  useCartLines,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

export default reactExtension(
  "purchase.checkout.shipping-option-list.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
  const { query } = useApi();
  const deliveryGroups = useDeliveryGroups();
  const cartLines = useCartLines();
  
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

  // Check if shipping address has been entered
  const hasShippingAddress = deliveryGroups.length > 0 && 
                            deliveryGroups[0]?.deliveryAddress !== undefined;

  // Check for selected delivery method
  useEffect(() => {
    if (!hasShippingAddress || cartLines.length === 0) {
      setLoading(false);
      return;
    }

    const checkDeliveryMethod = async () => {
      try {
        setLoading(true);
        
        // Query the selected delivery option
        const result = await query(`
          query {
            deliveryGroups {
              selectedDeliveryOption {
                handle
                type
              }
            }
          }
        `);

        const selectedOption = result?.data?.deliveryGroups?.[0]?.selectedDeliveryOption;
        
        // Check if local delivery is selected by checking the type
        // The type field should contain the delivery method type (LOCAL, SHIPPING, PICKUP, etc.)
        const isLocal = selectedOption && 
          (selectedOption.type === 'LOCAL' || 
           selectedOption.handle?.includes('local'));
        
        setIsLocalDeliverySelected(!!isLocal);
      } catch (error) {
        console.error('Error checking delivery method:', error);
        // If we can't determine the delivery method, default to showing the component
        setIsLocalDeliverySelected(true);
      } finally {
        setLoading(false);
      }
    };

    checkDeliveryMethod();
  }, [hasShippingAddress, query, deliveryGroups, cartLines]);

  const handlePrintShopChange = (value: string) => {
    setSelectedPrintShop(value);
  };

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id,
      label: shop.name
    }))
  ];

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