const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to calculate estimated completion time
function calculateEstimatedCompletion() {
  const now = new Date();
  const estimatedDays = 3; // Default 3 business days
  const completion = new Date(now.getTime() + (estimatedDays * 24 * 60 * 60 * 1000));
  return completion.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

exports.handler = async (event, context) => {
  // CORS headers for cross-origin requests from checkout extensions
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Checkout DIY Label order creation started');
    
    const body = JSON.parse(event.body);
    console.log('Request body:', body);
    
    const {
      shopifyOrderId,
      shopDomain,
      printShopId,
      productData,
      customerData,
      options = {}
    } = body;

    // Validate required fields
    if (!shopDomain || !printShopId || !productData || !customerData) {
      console.log('Validation failed:', { shopifyOrderId, shopDomain, printShopId, productData, customerData });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required fields: shopDomain, printShopId, productData, customerData' 
        })
      };
    }

    // Get store
    console.log('Looking up store:', shopDomain);
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      console.log('Store lookup failed:', storeError);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Store not found' })
      };
    }
    console.log('Store found:', store.id);

    // Verify print shop exists and is active
    console.log('Looking up print shop:', printShopId);
    const { data: printShop, error: printShopError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, active')
      .eq('id', printShopId)
      .eq('active', true)
      .single();

    if (printShopError || !printShop) {
      console.log('Print shop lookup failed:', printShopError);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Print shop not found or inactive' })
      };
    }
    console.log('Print shop found:', printShop.name);

    // Create DIY Label order with checkout extension source
    console.log('Creating DIY Label order from checkout extension...');
    const { data: order, error: orderError } = await supabaseAdmin
      .from('diy_label_orders')
      .insert({
        shopify_order_id: shopifyOrderId || `checkout-${Date.now()}`,
        shopify_store_id: store.id,
        print_shop_id: printShopId,
        product_data: productData,
        customer_data: customerData,
        status: 'pending',
        tracking_info: {
          created_at: new Date().toISOString(),
          source: 'checkout_extension',
          options
        }
      })
      .select()
      .single();

    if (orderError) {
      console.log('Order creation failed:', orderError);
      throw orderError;
    }
    console.log('Order created successfully:', order.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          printShop: printShop.name,
          estimatedCompletion: calculateEstimatedCompletion(),
          source: 'checkout_extension'
        }
      })
    };

  } catch (error) {
    console.error('Error creating checkout DIY Label order:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to create DIY Label order',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};