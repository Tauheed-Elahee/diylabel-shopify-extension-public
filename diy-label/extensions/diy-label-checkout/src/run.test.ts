import { describe, it, expect } from 'vitest';
import { run } from './run';
import { RunInput, FunctionRunResult } from '../generated/api';

describe('DIY Label local pickup delivery option generator', () => {
  const mockInput: RunInput = {
    cart: {
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          merchandise: {
            __typename: 'ProductVariant',
            id: "gid://shopify/ProductVariant/1",
            product: {
              id: "gid://shopify/Product/1",
              handle: "test-tshirt"
            }
          }
        }
      ],
      attribute: {
        value: 'true'
      },
      buyerIdentity: {
        customer: {
          id: "gid://shopify/Customer/1"
        }
      }
    },
    fulfillmentGroups: [
      {
        handle: "1",
        lines: [
          {
            id: "gid://shopify/CartLine/1"
          }
        ],
        deliveryGroup: {
          id: "gid://shopify/CartDeliveryGroup/1"
        },
        inventoryLocationHandles: ["location1"]
      }
    ],
    locations: [
      {
        handle: "location1",
        name: "Main Store",
        address: {
          address1: "123 Store St",
          address2: null,
          city: "Store City",
          provinceCode: "CA",
          countryCode: "US",
          zip: "12345"
        }
      }
    ],
    deliveryOptionGenerator: {
      metafield: {
        value: '{"enabled": true, "defaultPickupTime": "2-3 business days", "sustainabilityMessage": true}'
      }
    }
  };

  it('returns DIY Label pickup option when enabled and DIY Label is selected', () => {
    const result = run(mockInput);
    
    const expected: FunctionRunResult = {
      operations: [
        {
          add: {
            title: "🌱 Local Print Shop",
            cost: 0,
            pickupLocation: {
              locationHandle: "diy-label-pickup",
              pickupInstruction: "Ready for pickup in 2-3 business days. 🌱 Printed locally to reduce shipping impact and support your community!"
            },
            description: "Your order will be printed locally and ready for pickup."
          }
        }
      ]
    };

    expect(result).toEqual(expected);
  });

  it('returns empty operations when DIY Label is disabled', () => {
    const disabledInput = {
      ...mockInput,
      deliveryOptionGenerator: {
        metafield: {
          value: '{"enabled": false}'
        }
      }
    };

    const result = run(disabledInput);
    expect(result).toEqual({ operations: [] });
  });

  it('returns empty operations when no DIY Label selection in cart', () => {
    const noSelectionInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        attribute: null // No DIY Label attribute
      }
    };

    const result = run(noSelectionInput);
    expect(result).toEqual({ operations: [] });
  });

  it('returns empty operations when cart is empty', () => {
    const emptyCartInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        lines: [] // No products in cart
      }
    };

    const result = run(emptyCartInput);
    expect(result).toEqual({ operations: [] });
  });

  it('handles sustainability messaging toggle', () => {
    const noSustainabilityInput = {
      ...mockInput,
      deliveryOptionGenerator: {
        metafield: {
          value: '{"enabled": true, "sustainabilityMessage": false, "defaultPickupTime": "2-3 business days"}'
        }
      }
    };

    const result = run(noSustainabilityInput);
    
    expect(result.operations[0].add.pickupLocation.pickupInstruction).toBe("Ready for pickup in 2-3 business days");
    expect(result.operations[0].add.pickupLocation.pickupInstruction).not.toContain("🌱");
  });

  it('uses custom pickup time from configuration', () => {
    const customTimeInput = {
      ...mockInput,
      deliveryOptionGenerator: {
        metafield: {
          value: '{"enabled": true, "defaultPickupTime": "Same day", "sustainabilityMessage": false}'
        }
      }
    };

    const result = run(customTimeInput);
    
    expect(result.operations[0].add.pickupLocation.pickupInstruction).toBe("Ready for pickup in Same day");
  });
});