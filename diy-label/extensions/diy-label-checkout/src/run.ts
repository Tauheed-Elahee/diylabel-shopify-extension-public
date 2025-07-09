import {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

interface DIYLabelConfig {
  enabled: boolean;
  defaultPickupTime: string;
  sustainabilityMessage: boolean;
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

  // Check if cart has DIY Label selection using the single attribute query
  const diyLabelEnabled = input.cart.attribute?.value === 'true';

  if (!diyLabelEnabled) {
    return { operations: [] };
  }

  // Since we can only query one attribute at a time in Functions,
  // we'll need to get the DIY Label data from a different approach
  // For now, let's create a basic pickup option and enhance it later
  
  // Check if we have products in the cart (we can't check tags in Functions)
  const hasProducts = input.cart.lines.length > 0;

  if (!hasProducts) {
    return { operations: [] };
  }

  // Generate a basic DIY Label pickup option
  // In a real implementation, you'd store the print shop data in the cart attribute value
  // as a JSON string, or use a separate metafield lookup
  
  let pickupInstruction = `Ready for pickup in ${configuration.defaultPickupTime}`;
  
  if (configuration.sustainabilityMessage) {
    pickupInstruction += '. 🌱 Printed locally to reduce shipping impact and support your community!';
  }

  // Generate the pickup option
  const operations = [
    {
      add: {
        title: "🌱 Local Print Shop",
        cost: 0, // Local pickup is free
        pickupLocation: {
          locationHandle: "diy-label-pickup",
          pickupInstruction: pickupInstruction
        },
        description: "Your order will be printed locally and ready for pickup.",
      }
    }
  ];

  return { operations };
}