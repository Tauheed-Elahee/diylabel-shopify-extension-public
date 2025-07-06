import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const order = payload as any;
    
    console.log('Processing order:', order.id);
    console.log('Order attributes:', order.note_attributes);
    
    // Check if this order has DIY Label attributes
    const noteAttributes = order.note_attributes || [];
    const diyLabelEnabled = noteAttributes.find(
      attr => attr.name === 'diy_label_enabled' && attr.value === 'true'
    );
    
    if (diyLabelEnabled) {
      console.log('DIY Label order detected:', order.id);
      
      // Extract DIY Label data from order attributes
      const printShopId = noteAttributes.find(
        attr => attr.name === 'diy_label_print_shop_id'
      )?.value;
      
      const printShopName = noteAttributes.find(
        attr => attr.name === 'diy_label_print_shop_name'
      )?.value;
      
      const printShopAddress = noteAttributes.find(
        attr => attr.name === 'diy_label_print_shop_address'
      )?.value;
      
      const customerLocation = noteAttributes.find(
        attr => attr.name === 'diy_label_customer_location'
      )?.value;
      
      const reusedApparel = noteAttributes.find(
        attr => attr.name === 'diy_label_reused_apparel'
      )?.value === 'true';
      
      const specialInstructions = noteAttributes.find(
        attr => attr.name === 'diy_label_instructions'
      )?.value;

      // Get store
      const { data: store } = await supabaseAdmin
        .from('shopify_stores')
        .select('id')
        .eq('shop_domain', shop)
        .single();

      if (store && printShopId) {
        // Filter line items for DIY Label products
        const diyLineItems = order.line_items.filter(item => {
          return item.properties && item.properties.some(prop => 
            prop.name === 'diy_label_enabled' && prop.value === 'true'
          );
        });
        
        // Create DIY Label order record
        const { data: diyOrder, error: orderError } = await supabaseAdmin
          .from('diy_label_orders')
          .insert({
            shopify_order_id: order.id.toString(),
            shopify_store_id: store.id,
            print_shop_id: parseInt(printShopId),
            product_data: {
              line_items: diyLineItems.length > 0 ? diyLineItems : order.line_items,
              total_price: order.total_price,
              currency: order.currency,
              order_number: order.order_number,
              reused_apparel: reusedApparel,
              special_instructions: specialInstructions
            },
            customer_data: {
              name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Unknown',
              email: order.customer?.email || '',
              phone: order.customer?.phone || '',
              shipping_address: order.shipping_address,
              billing_address: order.billing_address
            },
            status: 'pending',
            tracking_info: {
              print_shop_name: printShopName,
              print_shop_address: printShopAddress,
              customer_location: customerLocation ? JSON.parse(customerLocation) : null,
              created_from_webhook: true,
              webhook_timestamp: new Date().toISOString(),
              source: 'checkout_extension'
            }
          })
          .select()
          .single();
        
        if (orderError) {
          console.error('Error creating DIY Label order:', orderError);
        } else {
          console.log(`DIY Label order created: ${diyOrder.id} for Shopify order ${order.id}`);
          
          // TODO: Send notification to print shop
          // TODO: Send confirmation email to customer
          // TODO: Update Shopify order with DIY Label tracking info
        }
      } else {
        console.log('DIY Label enabled but no print shop ID found in order attributes or store not found');
      }
    } else {
      // Check individual line items for DIY Label enabled products (fallback)
      await processLineItemsForDIYLabel(order, shop);
    }

  } catch (error) {
    console.error('Error processing order webhook:', error);
  }

  return new Response();
};

// Helper function to process line items
async function processLineItemsForDIYLabel(order: any, shop: string) {
  const lineItems = order.line_items || [];
  
  // Get store once for all line items
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('id')
    .eq('shop_domain', shop)
    .single();
  
  if (!store) {
    console.log('Store not found for shop:', shop);
    return;
  }

  // Process each line item
  for (const item of lineItems) {
    const productId = item.product_id?.toString();
    
    if (productId) {
      // Check product settings
      const { data: productSettings } = await supabaseAdmin
        .from('product_settings')
        .select('*')
        .eq('shopify_store_id', store.id)
        .eq('shopify_product_id', productId)
        .single();

      if (productSettings?.diy_label_enabled) {
        console.log(`DIY Label product detected: ${order.id} for product ${productId} (no cart selection)`);
        
        // TODO: Send email to customer for print shop selection
        // TODO: Create pending DIY Label order awaiting print shop selection
      }
    }
  }
}