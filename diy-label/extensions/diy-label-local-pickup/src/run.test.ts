import { describe, it, expect } from 'vitest';
import { run } from './run';
import type { RunInput, FunctionRunResult } from '../generated/api';

describe('DIY Label local pickup delivery option generator', () => {
  const mockInput: RunInput = {
    cart: {
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          merchandise: {
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
    deliveryGroups: [
      {
        id: "gid://shopify/CartDeliveryGroup/1",
        deliveryAddress: {
          address1: "123 Test St",
          address2: null,
          city: "Test City",
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
    
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].add.title).toBe("🌱 Local Print Shop Pickup");
    expect(result.operations[0].add.cost.amount).toBe("0.00");
    expect(result.operations[0].add.deliveryMethodDefinition.methodType).toBe("PICKUP");
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
    expect(result.operations).toHaveLength(0);
  });

  it('returns empty operations when no DIY Label selection in cart', () => {
    const noSelectionInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        attribute: null
      }
    };

    const result = run(noSelectionInput);
    expect(result.operations).toHaveLength(0);
  });

  it('returns empty operations when cart is empty', () => {
    const emptyCartInput = {
      ...mockInput,
      cart: {
        ...mockInput.cart,
        lines: []
      }
    };

    const result = run(emptyCartInput);
    expect(result.operations).toHaveLength(0);
  });
});