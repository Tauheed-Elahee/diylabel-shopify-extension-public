import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productId = url.searchParams.get('product');

  // CORS headers for cross-origin requests from Shopify stores
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (!shopDomain || !productId) {
    return json({ error: 'Missing shop domain or product ID' }, { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({ enabled: false, error: 'Store not found' }, {
        headers: corsHeaders
      });
    }

    // Check if productId is a handle (contains non-numeric characters) or an ID
    const isHandle = isNaN(Number(productId)) || productId.includes('-');
    
    console.log('Product settings check:', { productId, isHandle, shopDomain });

    if (isHandle) {
      // If it's a handle, we need to convert it to an ID using Shopify API
      // For now, we'll return enabled: false for handles since we can't easily convert them
      // In a real implementation, you'd use the Shopify Admin API to convert handle to ID
      console.log('Product ID appears to be a handle, cannot check settings without conversion');
      return json({ 
        enabled: false, 
        error: 'Product handle provided instead of ID',
        note: 'DIY Label requires product ID, not handle'
      }, {
        headers: corsHeaders
      });
    }

    // Get product settings using the numeric product ID
    const { data: productSettings, error: settingsError } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store.id)
      .eq('shopify_product_id', productId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching product settings:', settingsError);
      return json({ enabled: false, error: 'Database error' }, {
        headers: corsHeaders
      });
    }

    // Return settings or default values
    return json({
      enabled: productSettings?.diy_label_enabled || false,
      allowReusedApparel: productSettings?.allow_reused_apparel || false,
      settings: productSettings?.settings || {}
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in product-settings API:', error);
    return json({ 
      enabled: false, 
      error: 'Failed to fetch product settings' 
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
};

// Handle OPTIONS preflight requests
export const action = async ({ request }: LoaderFunctionArgs) => {
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
  
  return new Response('Method not allowed', { status: 405 });
};