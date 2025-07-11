// Generated types for DIY Label Local Pickup Function

export interface RunInput {
  cart: {
    lines: Array<{
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        product: {
          id: string;
          handle: string;
        };
      };
    }>;
    attribute: {
      value: string;
    } | null;
    buyerIdentity: {
      customer: {
        id: string;
      } | null;
    };
  };
  deliveryGroups: Array<{
    id: string;
    deliveryAddress: {
      address1: string | null;
      address2: string | null;
      city: string | null;
      provinceCode: string | null;
      countryCode: string | null;
      zip: string | null;
    } | null;
  }>;
  deliveryOptionGenerator: {
    metafield: {
      value: string;
    } | null;
  };
}

export interface FunctionRunResult {
  operations: Array<{
    add: {
      title: string;
      cost: {
        amount: string;
        currencyCode: "USD" | "CAD" | "EUR" | "GBP";
      };
      description?: string;
      deliveryMethodDefinition: {
        id: string;
        name: string;
        description: string;
        methodType: "SHIPPING" | "PICKUP" | "LOCAL_DELIVERY";
      };
    };
  }>;
}

export interface DeliveryOptionGenerator {
  metafield: {
    value: string;
  } | null;
}