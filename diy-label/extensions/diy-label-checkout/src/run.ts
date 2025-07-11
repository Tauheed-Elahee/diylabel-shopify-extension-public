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
  // Parse configuration from metafield (following tutorial pattern)
  const configuration: DIYLabelConfig = JSON.parse(
    input?.deliveryOptionGenerator?.metafield?.value ?? '{"enabled": true, "defaultPickupTime": "2-3 business days", "sustainabilityMessage": true}'
  );

  // Check if DIY Label is enabled in configuration
  if (!configuration.enabled) {
    return { operations: [] };
  }

  // Check if DIY Label is enabled via cart attributes (following tutorial pattern)
  const diyLabelEnabled = input.cart.attributes?.find(
    attr => attr.key === "diy_label_enabled" && attr.value === "true"
  );

  // Only proceed if DIY Label is enabled and cart has items (tutorial validation pattern)
  if (!diyLabelEnabled || input.cart.lines.length === 0) {
    return { operations: [] };
  }

  // Get print shop details from cart attributes
  const printShopName = input.cart.attributes?.find(
    attr => attr.key === "diy_label_print_shop_name"
  )?.value || "Local Print Shop";

  const printShopAddress = input.cart.attributes?.find(
    attr => attr.key === "diy_label_print_shop_address"
  )?.value;

  // Build description following tutorial pattern
  let description = `Free pickup from ${printShopName}. Ready in ${configuration.defaultPickupTime}.`;
  
  if (configuration.sustainabilityMessage) {
    description += " 🌱 Supports your community and reduces shipping impact!";
  }

  // Return delivery option following tutorial format exactly
  return {
    operations: [
      {
        add: {
          title: "🌱 Local Print Shop Pickup",
          cost: {
            amount: "0.00",
            currencyCode: "USD"
          },
          description: description
        }
      }
    ]
  };
}