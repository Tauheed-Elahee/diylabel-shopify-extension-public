import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Check if this order has DIY Label items
    const order = payload as any;
    
    // Look for line items that might be DIY Label enabled
    const lineItems = order.line_items || [];
    
    for (const item of lineItems) {
      // Check if this product has DIY Label enabled
      const productId = item.product_id?.toString();
      if (!productId) continue;

      // Get store
      const { data: store } = await supabaseAdmin
        .from('shopify_stores')
        .select('id')
        .eq('shop_domain', shop)
        .single();

      if (!store) continue;

      // Check product settings
      const { data: productSettings } = await supabaseAdmin
        .from('product_settings')
        .select('*')
        .eq('shopify_store_id', store.id)
        .eq('shopify_product_id', productId)
        .single();

      if (productSettings?.diy_label_enabled) {
        // This is a DIY Label order - we would normally:
        // 1. Create a DIY Label order record
        // 2. Notify the customer about print shop selection
        // 3. Send order details to potential print shops
        
        console.log(`DIY Label order detected: ${order.id} for product ${productId}`);
        
        // For now, just log that we detected a DIY Label order
        // In a real implementation, you might:
        // - Send an email to the customer with print shop options
        // - Create a pending DIY Label order
        // - Integrate with the customer widget for print shop selection
      }
    }

  } catch (error) {
    console.error('Error processing order webhook:', error);
  }

  return new Response();
};