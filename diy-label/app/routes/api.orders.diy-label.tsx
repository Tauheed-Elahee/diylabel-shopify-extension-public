import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {

    const {
      shopifyOrderId,
      shopDomain,
      printShopId,
      productData,
      options = {}
    } = body;

    console.log('DIY Label order creation started for:', shopifyOrderId);
    
    // Validate required fields
      return json({ 
        error: 'Missing required fields: shopifyOrderId, shopDomain, printShopId, productData, customerData' 
      }, { status: 400 });
    }

    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .select('id')
      .eq('shop_domain', shopDomain)

    if (storeError || !store) {
    }

    // Verify print shop exists and is active
    const { data: printShop, error: printShopError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, active')
      .eq('id', printShopId)
      .eq('active', true)

    if (printShopError || !printShop) {
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('diy_label_orders')
      .insert({
        shopify_order_id: shopifyOrderId,
        shopify_store_id: store.id,
        print_shop_id: printShopId,
        product_data: productData,
        customer_data: customerData,
        status: 'pending',
        tracking_info: {
          created_at: new Date().toISOString(),
          options,
          source: 'api_direct'
        }
      })
      .select()
      .single();

    if (orderError) {
    }

    
    console.log('DIY Label order created successfully:', {
      orderId: order.id,
      shopifyOrderId: shopifyOrderId,
      printShop: printShop.name
    });
    // TODO: Send confirmation email to customer
    // TODO: Update Shopify order with DIY Label tracking info

    return json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        printShop: printShop.name,
        estimatedCompletion: calculateEstimatedCompletion()
      }
    });

  } catch (error) {
    console.error('Error creating DIY Label order:', error);
    return json({ 
      error: 'Failed to create DIY Label order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

function calculateEstimatedCompletion(): string {
  // Simple estimation: 3-5 business days from now
  const now = new Date();
  const businessDays = 4; // Average of 3-5 days
  let estimatedDate = new Date(now);
  
  let addedDays = 0;
  while (addedDays < businessDays) {
    estimatedDate.setDate(estimatedDate.getDate() + 1);
    // Skip weekends
    if (estimatedDate.getDay() !== 0 && estimatedDate.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return estimatedDate.toISOString();
}