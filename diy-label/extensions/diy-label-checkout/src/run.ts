import {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

type Configuration = {};

export function run(input: RunInput): FunctionRunResult {
  const configuration: Configuration = JSON.parse(
    input?.deliveryOptionGenerator?.metafield?.value ?? "{}"
  );

  return {
    operations: [
      {
        add: {
          title: "Main St.",
          cost: 1.99,
          pickupLocation: {
            locationHandle: "2578303",
            pickupInstruction: "Usually ready in 24 hours."
          }
        }
      }
    ],
  };
}