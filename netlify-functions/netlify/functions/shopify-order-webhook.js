const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to verify Shopify webhook signature
function verifyShopifyWebhook(body, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const calculatedSignature = hmac.digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(calculatedSignature, 'base64')
  );
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    // Verify webhook signature for security
    const signature = event.headers['x-shopify-hmac-sha256'];
    if (shopifyApiSecret && !verifyShopifyWebhook(event.body, signature, shopifyApiSecret)) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 401,
        body: 'Unauthorized - Invalid signature'
      };
    }

    const payload = JSON.parse(event.body);
    const shopDomain = event.headers['x-shopify-shop-domain'];
    const topic = event.headers['x-shopify-topic'];

    console.log(`Received ${topic} webhook for ${shopDomain}, Order ID: ${payload.id}`);

    if (topic === 'orders/paid') {
      const order = payload;

      // Check if this order has DIY Label attributes from cart
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

        // Get store from database
        const { data: store } = await supabaseAdmin
          .from('shopify_stores')
          .select('id')
          .eq('shop_domain', shopDomain)
          .single();

        if (store && printShopId) {
          console.log('Creating DIY Label order for print shop:', printShopId);

          // Create DIY Label order record in database
          const { data: diyOrder, error: orderError } = await supabaseAdmin
            .from('diy_label_orders')
            .insert({
              shopify_order_id: order.id.toString(),
              shopify_store_id: store.id,
              print_shop_id: parseInt(printShopId),
              product_data: {
                line_items: order.line_items,
                total_price: order.total_price,
                currency: order.currency,
                order_number: order.order_number
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
                order_created_at: order.created_at,
                order_processed_at: order.processed_at
              }
            })
            .select()
            .single();

          if (orderError) {
            console.error('Error creating DIY Label order:', orderError);
          } else {
            console.log(`DIY Label order created: ${diyOrder.id} for Shopify order ${order.id}`);
          }
        } else {
          console.log('DIY Label enabled but missing data:', {
            storeFound: !!store,
            printShopId: printShopId,
            printShopName: printShopName
          });
        }
      } else {
        console.log('No DIY Label attributes found for order:', order.id);
        // Optionally process individual line items for DIY Label enabled products
        await processLineItemsForDIYLabel(order, shopDomain);
      }
    }

    return {
      statusCode: 200,
      body: 'Webhook received and processed'
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
};

// Helper function to process line items for DIY Label enabled products
async function processLineItemsForDIYLabel(order, shopDomain) {
  const lineItems = order.line_items || [];
  
  // Get store once for all line items
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();
  
  if (!store) {
    console.log('Store not found for shop:', shopDomain);
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