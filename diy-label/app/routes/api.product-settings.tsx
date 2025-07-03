import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productIdentifier = url.searchParams.get('product'); // Could be ID or handle

  // CORS headers for cross-origin requests from Shopify stores
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (!shopDomain || !productIdentifier) {
    return json({ error: 'Missing shop domain or product identifier' }, { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({ enabled: false, error: 'Store not found' }, {
        headers: corsHeaders
      });
    }

    // Check if productIdentifier is a handle (contains non-numeric characters) or an ID
    const isHandle = isNaN(Number(productIdentifier)) || productIdentifier.includes('-');
    let productId = productIdentifier;
    
    console.log('Product settings check:', { productIdentifier, isHandle, shopDomain });

    if (isHandle) {
      // Convert handle to ID using Shopify Admin API
      try {
        console.log('Converting product handle to ID:', productIdentifier);
        
        // Create Shopify Admin API client
        const shopifyApiUrl = `https://${shopDomain}/admin/api/2023-10/products.json?handle=${productIdentifier}&fields=id`;
        
        const response = await fetch(shopifyApiUrl, {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Shopify API error:', response.status, response.statusText);
          return json({ 
            enabled: false, 
            error: 'Failed to fetch product from Shopify API',
            details: `HTTP ${response.status}`
          }, {
            headers: corsHeaders
          });
        }

        const data = await response.json();
        
        if (!data.products || data.products.length === 0) {
          console.log('Product not found with handle:', productIdentifier);
          return json({ 
            enabled: false, 
            error: 'Product not found',
            note: `No product found with handle: ${productIdentifier}`
          }, {
            headers: corsHeaders
          });
        }

        // Extract the numeric ID from the Shopify response
        productId = data.products[0].id.toString();
        console.log('Successfully converted handle to ID:', { handle: productIdentifier, id: productId });

      } catch (error) {
        console.error('Error converting handle to ID:', error);
        return json({ 
          enabled: false, 
          error: 'Failed to convert product handle to ID',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, {
          headers: corsHeaders
        });
      }
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
    const result = {
      enabled: productSettings?.diy_label_enabled || false,
      allowReusedApparel: productSettings?.allow_reused_apparel || false,
      settings: productSettings?.settings || {},
      productId: productId, // Include the resolved product ID
      originalIdentifier: productIdentifier,
      wasConverted: isHandle
    };

    console.log('Product settings result:', result);

    return json(result, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in product-settings API:', error);
    return json({ 
      enabled: false, 
      error: 'Failed to fetch product settings',
      details: error instanceof Error ? error.message : 'Unknown error'
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