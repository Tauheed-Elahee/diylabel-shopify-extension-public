use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn run(input: schema::run::Input) -> Result<schema::FunctionRunResult> {
    // Check if DIY Label is enabled via cart attribute
    let diy_label_enabled = input
        .cart()
        .attribute()
        .as_ref()
        .map(|attr| attr.value().map_or(false, |v| v == "pickup" || v == "true"))
        .unwrap_or(false);

    // If DIY Label is not enabled, return no operations
    if !diy_label_enabled {
        return Ok(schema::FunctionRunResult { operations: vec![] });
    }

    // Check if cart has items
    if input.cart().lines().is_empty() {
        return Ok(schema::FunctionRunResult { operations: vec![] });
    }

    // Always create pickup option for DIY Label orders, even without POS locations
    let location_handle = if let Some(location) = input.locations().first() {
        // Use existing POS location if available
        location.handle().clone()
    } else {
        // Create a virtual location handle for POD merchants without POS locations
        "diy-label-virtual-location".to_string()
    };

    let operations = vec![schema::Operation {
        add: schema::LocalPickupDeliveryOption {
            title: Some("🌱 Local Print Shop Pickup".to_string()),
            cost: Some(Decimal(0.0)), // Free pickup
            pickup_location: schema::PickupLocation {
                location_handle,
                pickup_instruction: Some(
                    "Your order will be printed at a local print shop and ready for pickup. You'll receive a notification with pickup details when it's ready.".to_string()
                ),
            },
            metafields: None,
        },
    }];

    Ok(schema::FunctionRunResult { operations })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::{run_function_with_input, Result};

    #[test]
    fn test_no_operations_when_diy_label_not_enabled() -> Result<()> {
        let result = run_function_with_input(
            run,
            r#"
            {
                "cart": {
                    "attribute": null,
                    "lines": [
                        {
                            "id": "gid://shopify/CartLine/1",
                            "quantity": 1,
                            "merchandise": {
                                "__typename": "ProductVariant",
                                "id": "gid://shopify/ProductVariant/1",
                                "product": {
                                    "id": "gid://shopify/Product/1",
                                    "title": "Test Product"
                                }
                            }
                        }
                    ]
                },
                "fulfillmentGroups": [],
                "locations": [],
                "deliveryOptionGenerator": {
                    "metafield": null
                }
            }
            "#,
        )?;

        let expected = schema::FunctionRunResult { operations: vec![] };
        assert_eq!(result, expected);
        Ok(())
    }

    #[test]
    fn test_creates_pickup_option_with_pos_location() -> Result<()> {
        let result = run_function_with_input(
            run,
            r#"
            {
                "cart": {
                    "attribute": {
                        "value": "pickup"
                    },
                    "lines": [
                        {
                            "id": "gid://shopify/CartLine/1",
                            "quantity": 1,
                            "merchandise": {
                                "__typename": "ProductVariant",
                                "id": "gid://shopify/ProductVariant/1",
                                "product": {
                                    "id": "gid://shopify/Product/1",
                                    "title": "Test Product"
                                }
                            }
                        }
                    ]
                },
                "fulfillmentGroups": [
                    {
                        "handle": "1",
                        "lines": [
                            {
                                "id": "gid://shopify/CartLine/1"
                            }
                        ],
                        "deliveryGroup": {
                            "id": "gid://shopify/CartDeliveryGroup/1"
                        },
                        "inventoryLocationHandles": ["test_location"]
                    }
                ],
                "locations": [
                    {
                        "handle": "test_location",
                        "name": "Test Location",
                        "address": {
                            "address1": "123 Test St",
                            "address2": null,
                            "city": "Test City",
                            "provinceCode": "CA",
                            "countryCode": "US",
                            "zip": "12345"
                        }
                    }
                ],
                "deliveryOptionGenerator": {
                    "metafield": null
                }
            }
            "#,
        )?;

        // Verify that we get one operation
        assert_eq!(result.operations.len(), 1);
        
        // Verify the operation details
        if let schema::Operation { add: pickup_option } = &result.operations[0] {
            assert_eq!(pickup_option.title, Some("🌱 Local Print Shop Pickup".to_string()));
            assert_eq!(pickup_option.cost, Some(Decimal(0.0)));
            assert_eq!(pickup_option.pickup_location.location_handle, "test_location");
            assert!(pickup_option.pickup_location.pickup_instruction.is_some());
        }

        Ok(())
    }

    #[test]
    fn test_creates_pickup_option_without_pos_location() -> Result<()> {
        let result = run_function_with_input(
            run,
            r#"
            {
                "cart": {
                    "attribute": {
                        "value": "true"
                    },
                    "lines": [
                        {
                            "id": "gid://shopify/CartLine/1",
                            "quantity": 1,
                            "merchandise": {
                                "__typename": "ProductVariant",
                                "id": "gid://shopify/ProductVariant/1",
                                "product": {
                                    "id": "gid://shopify/Product/1",
                                    "title": "Test Product"
                                }
                            }
                        }
                    ]
                },
                "fulfillmentGroups": [],
                "locations": [],
                "deliveryOptionGenerator": {
                    "metafield": null
                }
            }
            "#,
        )?;

        // Verify that we get one operation even without POS locations
        assert_eq!(result.operations.len(), 1);
        
        // Verify the operation details
        if let schema::Operation { add: pickup_option } = &result.operations[0] {
            assert_eq!(pickup_option.title, Some("🌱 Local Print Shop Pickup".to_string()));
            assert_eq!(pickup_option.cost, Some(Decimal(0.0)));
            assert_eq!(pickup_option.pickup_location.location_handle, "diy-label-virtual-location");
            assert!(pickup_option.pickup_location.pickup_instruction.is_some());
        }

        Ok(())
    }

    #[test]
    fn test_no_operations_when_cart_empty() -> Result<()> {
        let result = run_function_with_input(
            run,
            r#"
            {
                "cart": {
                    "attribute": {
                        "value": "pickup"
                    },
                    "lines": []
                },
                "fulfillmentGroups": [],
                "locations": [],
                "deliveryOptionGenerator": {
                    "metafield": null
                }
            }
            "#,
        )?;

        let expected = schema::FunctionRunResult { operations: vec![] };
        assert_eq!(result, expected);
        Ok(())
    }
}