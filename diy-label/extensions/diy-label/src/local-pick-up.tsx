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
  useDeliveryGroupListTarget,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

export default reactExtension(
  "purchase.checkout.pickup-location-list.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
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

  // Check if Shipping Address has been entered
  const shippingAddress = useShippingAddress();

  // Check Delivery Option
  const deliveryGroups = useDeliveryGroups();
  const selectedOption = useDeliveryGroup(deliveryGroups[0])?.selectedDeliveryOption;

  // Only render your component if the address has been entered
  if (!shippingAddress || !shippingAddress.address1) {
    return null;
  }

  const { selectedDeliveryOption } = useDeliveryGroupListTarget();

  return (
    <Banner status="info">
      <BlockStack>
        <Text>
           {selectedDeliveryOption
            ? `Selected delivery option type: ${selectedDeliveryOption.type}`
            : 'No delivery option selected'}
        </Text>
      </BlockStack>
    </Banner>
  );
}
