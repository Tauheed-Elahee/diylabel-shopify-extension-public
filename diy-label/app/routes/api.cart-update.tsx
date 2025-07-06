import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  // CORS headers for cross-origin requests from Shopify stores
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  try {
    const body = await request.json();
    const { shopDomain, printShop, userLocation, productId } = body;

    console.log('Cart update request:', { shopDomain, printShop: printShop?.name, productId });

    // Validate required fields
    if (!shopDomain || !printShop) {
      return json({ 
        error: 'Missing required fields: shopDomain, printShop' 
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Return the cart update data that should be sent to Shopify
    const cartUpdateData = {
      attributes: {
        'diy_label_enabled': 'true',
        'diy_label_print_shop_id': printShop.id.toString(),
        'diy_label_print_shop_name': printShop.name,
        'diy_label_print_shop_address': printShop.address,
        'diy_label_customer_location': JSON.stringify(userLocation),
        'diy_label_product_id': productId || '',
        'diy_label_selection_timestamp': new Date().toISOString()
      }
    };

    return json({
      success: true,
      cartUpdateData,
      message: 'Cart update data prepared successfully'
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error preparing cart update:', error);
    return json({ 
      error: 'Failed to prepare cart update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
};

// Handle OPTIONS preflight requests
export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  
  return json({ message: 'Cart update API ready' });
};