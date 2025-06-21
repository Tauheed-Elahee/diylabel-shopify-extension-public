import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shopifyOrderId,
      shopDomain,
      printShopId,
      productData,
      customerData,
      options = {}
    } = body;

    // Validate required fields
    if (!shopifyOrderId || !shopDomain || !printShopId || !productData || !customerData) {
      return json({ 
        error: 'Missing required fields: shopifyOrderId, shopDomain, printShopId, productData, customerData' 
      }, { status: 400 });
    }

    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    // Verify print shop exists and is active
    const { data: printShop, error: printShopError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, active')
      .eq('id', printShopId)
      .eq('active', true)
      .single();

    if (printShopError || !printShop) {
      return json({ error: 'Print shop not found or inactive' }, { status: 404 });
    }

    // Create DIY Label order
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
          options
        }
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // TODO: Send notification to print shop
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