import {
  reactExtension,
  useOrder,
  Banner,
  BlockStack,
  Text,
  Button,
  InlineLayout,
  Link
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <DIYLabelThankYou />
);

function DIYLabelThankYou() {
  const order = useOrder();
  
  const diyLabelEnabled = order?.attributes?.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );
  
  if (!diyLabelEnabled) return null;
  
  const printShopName = order?.attributes?.find(
    attr => attr.key === 'diy_label_print_shop_name'
  )?.value;
  
  const printShopAddress = order?.attributes?.find(
    attr => attr.key === 'diy_label_print_shop_address'
  )?.value;
  
  const estimatedCompletion = order?.attributes?.find(
    attr => attr.key === 'diy_label_estimated_completion'
  )?.value;
  
  return (
    <BlockStack spacing="base">
      {/* Success Banner */}
      <Banner status="success">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Your order is going local!</Text>
          
          <Text>
            Your items will be printed at {printShopName} and will be ready 
            for pickup on {estimatedCompletion}.
          </Text>
        </BlockStack>
      </Banner>
      
      {/* Print Shop Information */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold">Print Shop Details</Text>
        
        <BlockStack spacing="tight">
          <Text emphasis="bold">📍 {printShopName}</Text>
          
          <Text size="small" appearance="subdued">
            {printShopAddress}
          </Text>
          
          <Text size="small">
            🕒 Estimated ready: {estimatedCompletion}
          </Text>
        </BlockStack>
      </BlockStack>
      
      {/* Next Steps */}
      <BlockStack spacing="base" border="base" padding="base" cornerRadius="base">
        <Text emphasis="bold">What happens next?</Text>
        
        <BlockStack spacing="tight">
          <Text size="small">
            1. We'll send your order details to {printShopName}
          </Text>
          
          <Text size="small">
            2. You'll receive updates as your order is printed
          </Text>
          
          <Text size="small">
            3. Pick up your order when it's ready (we'll notify you!)
          </Text>
        </BlockStack>
      </BlockStack>
      
      {/* Sustainability Impact */}
      <BlockStack spacing="tight" padding="base" border="base" cornerRadius="base">
        <Text emphasis="bold" size="small">♻️ Environmental Impact</Text>
        
        <Text size="small" appearance="subdued">
          By choosing local printing, you've helped save approximately 2.5kg of CO₂ 
          and supported your local community. Thank you for making a sustainable choice!
        </Text>
      </BlockStack>
      
      {/* Action Buttons */}
      <InlineLayout spacing="base">
        <Button
          kind="secondary"
          to={`/orders/${order?.id}/track`}
        >
          Track Your Order
        </Button>
        
        <Button kind="plain">
          Contact Print Shop
        </Button>
      </InlineLayout>
    </BlockStack>
  );
}