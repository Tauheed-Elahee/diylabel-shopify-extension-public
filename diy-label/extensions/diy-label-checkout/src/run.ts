import {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

interface DIYLabelConfig {
  enabled: boolean;
  defaultPickupTime: string;
  sustainabilityMessage: boolean;
}

interface PrintShopData {
  id: string;
  name: string;
  address: string;
  estimatedCompletion: string;
  distance?: string;
}

export function run(input: RunInput): FunctionRunResult {
  // Parse configuration from metafield
  const configuration: DIYLabelConfig = JSON.parse(
    input?.deliveryOptionGenerator?.metafield?.value ?? '{"enabled": true, "defaultPickupTime": "2-3 business days", "sustainabilityMessage": true}'
  );

  // Check if DIY Label is enabled
  if (!configuration.enabled) {
    return { operations: [] };
  }

  // Check if cart has DIY Label selection
  const diyLabelEnabled = input.cart.attributes.find(
    attr => attr.key === 'diy_label_enabled' && attr.value === 'true'
  );

  if (!diyLabelEnabled) {
    return { operations: [] };
  }

  // Extract DIY Label data from cart attributes
  const printShopId = input.cart.attributes.find(
    attr => attr.key === 'diy_label_print_shop_id'
  )?.value;

  const printShopName = input.cart.attributes.find(
    attr => attr.key === 'diy_label_print_shop_name'
  )?.value;

  const printShopAddress = input.cart.attributes.find(
    attr => attr.key === 'diy_label_print_shop_address'
  )?.value;

  const estimatedCompletion = input.cart.attributes.find(
    attr => attr.key === 'diy_label_estimated_completion'
  )?.value;

  const customerLocation = input.cart.attributes.find(
    attr => attr.key === 'diy_label_customer_location'
  )?.value;

  // If no print shop selected, return empty operations
  if (!printShopId || !printShopName) {
    return { operations: [] };
  }

  // Parse customer location for distance calculation
  let distance = '';
  if (customerLocation) {
    try {
      const location = JSON.parse(customerLocation);
      // Distance would be calculated on the frontend, but we can display it if available
      distance = location.distance ? ` (${location.distance} miles away)` : '';
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Calculate estimated pickup time
  const pickupTime = estimatedCompletion || configuration.defaultPickupTime;
  
  // Create pickup instruction with sustainability messaging
  let pickupInstruction = `Ready for pickup in ${pickupTime}`;
  
  if (configuration.sustainabilityMessage) {
    pickupInstruction += '. 🌱 Printed locally to reduce shipping impact and support your community!';
  }

  // Check if we have DIY Label products in the cart
  const hasDIYLabelProducts = input.cart.lines.some(line => {
    if (line.merchandise.__typename === 'ProductVariant') {
      return line.merchandise.product.tags.includes('diy-label') ||
             line.merchandise.product.tags.includes('diy_label');
    }
    return false;
  });

  if (!hasDIYLabelProducts) {
    return { operations: [] };
  }

  // Generate the pickup option
  const operations = [
    {
      add: {
        title: `🌱 ${printShopName}${distance}`,
        cost: 0, // Local pickup is free
        pickupLocation: {
          locationHandle: `diy-label-${printShopId}`,
          pickupInstruction: pickupInstruction
        },
        description: `Local printing at ${printShopName}. ${printShopAddress || 'Address available at pickup.'}`,
      }
    }
  ];

  return { operations };
}