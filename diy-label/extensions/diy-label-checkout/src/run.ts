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

  // Check if we have products in the cart (we can't check tags in Functions)
  const hasProducts = input.cart.lines.length > 0;

  if (!hasProducts) {
    return { operations: [] };
  }

  let pickupInstruction = `Ready for pickup in ${configuration.defaultPickupTime}`;
  
  if (configuration.sustainabilityMessage) {
    pickupInstruction += '. 🌱 Printed locally to reduce shipping impact and support your community!';
  }

  // Generate the pickup option
  const operations = [
    {
      add: {
        title: "🌱 Local Print Shop Pickup",
        cost: 0, // Local pickup is free
        pickupLocation: {
          locationHandle: "diy-label-pickup",
          pickupInstruction: pickupInstruction
        },
        description: "Free pickup from your selected local print shop. Supports your community and reduces shipping impact!",
      }
    }
  ];

  return { operations };
}