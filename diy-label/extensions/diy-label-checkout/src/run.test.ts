import { describe, it, expect } from 'vitest';
import { run } from './run';
import { RunInput, FunctionRunResult } from '../generated/api';

describe('DIY Label local pickup delivery option generator', () => {
  const mockInput: RunInput = {
    cart: {
      id: "gid://shopify/Cart/1",
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          merchandise: {
            __typename: 'ProductVariant',
            id: "gid://shopify/ProductVariant/1",
            product: {
              id: "gid://shopify/Product/1",
              handle: "test-tshirt",
              tags: ["diy-label", "apparel"]
            }
          }
        }
      ],
      attributes: [
        { key: 'diy_label_enabled', value: 'true' },
        { key: 'diy_label_print_shop_id', value: '123' },
        { key: 'diy_label_print_shop_name', value: 'Downtown Print Co.' },
        { key: 'diy_label_print_shop_address', value: '123 Main St, City, ST 12345' },
        { key: 'diy_label_estimated_completion', value: 'Tuesday, Jan 23' },
        { key: 'diy_label_customer_location', value: '{"lat": 37.7749, "lng": -122.4194, "distance": "2.3"}' }
      ]
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

  it('returns DIY Label pickup option when enabled and print shop selected', () => {
    const result = run(mockInput);
    
    const expected: FunctionRunResult = {
      operations: [
        {
          add: {
            title: "🌱 Downtown Print Co. (2.3 miles away)",
            cost: 0,
            pickupLocation: {
              locationHandle: "diy-label-123",
              pickupInstruction: "Ready for pickup in Tuesday, Jan 23. 🌱 Printed locally to reduce shipping impact and support your community!"
            },
            description: "Local printing at Downtown Print Co.. 123 Main St, City, ST 12345"
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
        attributes: [] // No DIY Label attributes
      }
    };

    const result = run(noSelectionInput);
    expect(result).toEqual({ operations: [] });
  });

  it('returns empty operations when no DIY Label products in cart', () => {
    const noDIYProductsInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 1,
            merchandise: {
              __typename: 'ProductVariant',
              id: "gid://shopify/ProductVariant/1",
              product: {
                id: "gid://shopify/Product/1",
                handle: "regular-product",
                tags: ["regular"] // No diy-label tag
              }
            }
          }
        ]
      }
    };

    const result = run(noDIYProductsInput);
    expect(result).toEqual({ operations: [] });
  });

  it('handles missing optional data gracefully', () => {
    const minimalInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        attributes: [
          { key: 'diy_label_enabled', value: 'true' },
          { key: 'diy_label_print_shop_id', value: '456' },
          { key: 'diy_label_print_shop_name', value: 'Simple Print Shop' }
          // Missing address, completion time, and location
        ]
      }
    };

    const result = run(minimalInput);
    
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].add.title).toBe("🌱 Simple Print Shop");
    expect(result.operations[0].add.pickupLocation.locationHandle).toBe("diy-label-456");
    expect(result.operations[0].add.description).toBe("Local printing at Simple Print Shop. Address available at pickup.");
  });

  it('uses default pickup time when estimated completion is not provided', () => {
    const noCompletionInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        attributes: [
          { key: 'diy_label_enabled', value: 'true' },
          { key: 'diy_label_print_shop_id', value: '789' },
          { key: 'diy_label_print_shop_name', value: 'Quick Print' }
          // No estimated_completion
        ]
      }
    };

    const result = run(noCompletionInput);
    
    expect(result.operations[0].add.pickupLocation.pickupInstruction).toContain("2-3 business days");
  });

  it('handles sustainability messaging toggle', () => {
    const noSustainabilityInput = {
      ...mockInput,
      deliveryOptionGenerator: {
        metafield: {
          value: '{"enabled": true, "sustainabilityMessage": false}'
        }
      }
    };

    const result = run(noSustainabilityInput);
    
    expect(result.operations[0].add.pickupLocation.pickupInstruction).not.toContain("🌱");
    expect(result.operations[0].add.pickupLocation.pickupInstruction).toBe("Ready for pickup in Tuesday, Jan 23");
  });
});