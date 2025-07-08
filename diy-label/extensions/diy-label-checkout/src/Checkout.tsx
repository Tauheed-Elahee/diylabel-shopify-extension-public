import {
  reactExtension,
  useCartLines,
  useApplyAttributeChange,
  useAttributes,
  Banner,
  BlockStack,
  Button,
  Text,
  InlineLayout,
  Icon,
  Pressable
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <DIYLabelCheckout />
);

function DIYLabelCheckout() {
  const cartLines = useCartLines();
  const attributes = useAttributes();
  const applyAttributeChange = useApplyAttributeChange();
  
  // Read data set by Theme App Extension
  const diyLabelEnabled = attributes.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );
  
  const selectedPrintShop = attributes.find(
    attr => attr.key === 'diy_label_print_shop_name'
  )?.value;
  
  const printShopAddress = attributes.find(
    attr => attr.key === 'diy_label_print_shop_address'
  )?.value;
  
  const estimatedCompletion = attributes.find(
    attr => attr.key === 'diy_label_estimated_completion'
  )?.value;
  
  // Don't show if no DIY Label products
  if (!diyLabelEnabled) return null;
  
  const handleChangePrintShop = async () => {
    // Open print shop selection in new window
    const width = 800;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `/widget?shop=${window.location.hostname}&mode=selection`,
      'printShopSelection',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };
  
  const handleRemoveDIYLabel = async () => {
    // Remove DIY Label from order
    await applyAttributeChange({
      type: 'updateAttribute',
      key: 'diy_label_enabled',
      value: 'false'
    });
  };
  
  return (
    <BlockStack spacing="base">
      {/* Main DIY Label Banner */}
      <Banner status="success">
        <BlockStack spacing="tight">
          <InlineLayout spacing="tight" blockAlignment="center">
            <Text emphasis="bold">🌱 Local Printing Selected</Text>
          </InlineLayout>
          
          <Text>
            Your order will be printed locally to reduce shipping impact 
            and support your community.
          </Text>
        </BlockStack>
      </Banner>
      
      {/* Print Shop Details */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold" size="medium">Print Shop Details</Text>
        
        <BlockStack spacing="tight">
          <Text emphasis="bold">{selectedPrintShop}</Text>
          
          <Text size="small" appearance="subdued">
            📍 {printShopAddress}
          </Text>
          
          {estimatedCompletion && (
            <Text size="small">
              🕒 Ready for pickup: {estimatedCompletion}
            </Text>
          )}
        </BlockStack>
        
        {/* Action Buttons */}
        <InlineLayout spacing="base">
          <Button
            kind="secondary"
            size="small"
            onPress={handleChangePrintShop}
          >
            Change Print Shop
          </Button>
          
          <Button
            kind="plain"
            size="small"
            onPress={handleRemoveDIYLabel}
          >
            Remove Local Printing
          </Button>
        </InlineLayout>
      </BlockStack>
      
      {/* Sustainability Impact */}
      <BlockStack spacing="tight" padding="base" border="base" cornerRadius="base">
        <Text emphasis="bold" size="small">♻️ Environmental Impact</Text>
        
        <Text size="small" appearance="subdued">
          By choosing local printing, you're saving approximately 2.5kg of CO₂ 
          compared to traditional shipping methods.
        </Text>
      </BlockStack>
    </BlockStack>
  );
}