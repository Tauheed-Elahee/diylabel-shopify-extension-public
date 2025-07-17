import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  useTranslate,
  useDeliveryGroups
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

export default reactExtension(
  "purchase.checkout.shipping-option-list.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
  const deliveryGroups = useDeliveryGroups();
  const [selectedPrintShop, setSelectedPrintShop] = useState("");

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

  const handlePrintShopChange = (value: string) => {
    setSelectedPrintShop(value);
  };

  // Check if shipping address has been entered
  const hasShippingAddress = deliveryGroups.length > 0 && 
                            deliveryGroups[0]?.deliveryAddress !== undefined;

  // If no shipping address, don't show the print shop selection
  if (!hasShippingAddress) {
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
    </BlockStack>
  );
}