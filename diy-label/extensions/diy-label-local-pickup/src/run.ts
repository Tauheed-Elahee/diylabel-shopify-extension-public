import type {
  RunInput,
  FunctionRunResult,
  DeliveryOptionGenerator,
} from "../generated/api";

interface DIYLabelConfig {
  enabled: boolean;
  defaultPickupTime: string;
  sustainabilityMessage: boolean;
}

export function run(input: RunInput): FunctionRunResult {
  console.log('🌱 DIY Label delivery option generator called');
  console.log('Input:', JSON.stringify(input, null, 2));

  // Parse configuration from metafield
  const configValue = input?.deliveryOptionGenerator?.metafield?.value;
  const configuration: DIYLabelConfig = configValue 
    ? JSON.parse(configValue)
    : {
        enabled: true,
        defaultPickupTime: "2-3 business days",
        sustainabilityMessage: true
      };

  console.log('Configuration:', configuration);

  // Check if DIY Label is enabled
  if (!configuration.enabled) {
    console.log('DIY Label is disabled in configuration');
    return { operations: [] };
  }

  // Check if cart has DIY Label selection
  const diyLabelEnabled = input.cart.attribute?.value === 'true';
  console.log('DIY Label enabled in cart:', diyLabelEnabled);

  if (!diyLabelEnabled) {
    console.log('DIY Label not enabled in cart attributes');
    return { operations: [] };
  }

  // Check if we have products in the cart
  const hasProducts = input.cart.lines.length > 0;
  console.log('Has products in cart:', hasProducts, 'Count:', input.cart.lines.length);

  if (!hasProducts) {
    console.log('No products in cart');
    return { operations: [] };
  }

  // Build pickup instruction
  let pickupInstruction = `Ready for pickup in ${configuration.defaultPickupTime}`;
  
  if (configuration.sustainabilityMessage) {
    pickupInstruction += '. 🌱 Printed locally to reduce shipping impact and support your community!';
  }

  console.log('Generating pickup option with instruction:', pickupInstruction);

  // Generate the delivery option
  const operations = [
    {
      add: {
        title: "🌱 Local Print Shop Pickup",
        cost: {
          amount: "0.00",
          currencyCode: "USD" as const
        },
        description: "Free pickup from your selected local print shop. Supports your community and reduces shipping impact!",
        deliveryMethodDefinition: {
          id: "diy-label-pickup",
          name: "DIY Label Local Pickup",
          description: pickupInstruction,
          methodType: "PICKUP" as const
        }
      }
    }
  ];

  console.log('Returning operations:', JSON.stringify(operations, null, 2));
  return { operations };
}