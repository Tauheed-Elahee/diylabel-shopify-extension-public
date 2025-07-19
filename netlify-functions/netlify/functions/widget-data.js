const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mapboxToken = process.env.VITE_MAPBOX_TOKEN;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

exports.handler = async (event, context) => {
  // CORS headers for cross-origin requests from Shopify stores
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { shop, product, lat, lng, radius } = event.queryStringParameters || {};

  if (!shop) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Shop domain is required' })
    };
  }

  try {
    // Get store settings
    const { data: store } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shop)
      .single();

    if (!store) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Store not found' })
      };
    }

    // Get product settings if productId is provided
    let productSettings = null;
    if (product) {
      const { data } = await supabaseAdmin
        .from('product_settings')
        .select('*')
        .eq('shopify_store_id', store.id)
        .eq('shopify_product_id', product)
        .single();
      
      productSettings = data;
    }

    // Get nearby print shops if location is provided
    let printShops = [];
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedRadius = parseInt(radius || '25');

      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        const { data: nearbyShops, error } = await supabaseAdmin
          .rpc('get_nearby_print_shops', {
            user_lat: parsedLat,
            user_lng: parsedLng,
            radius_km: parsedRadius
          });

        if (!error && nearbyShops) {
          printShops = nearbyShops.filter(shop => shop.active !== false);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        store: {
          shop_domain: store.shop_domain,
          settings: store.settings || {}
        },
        productSettings,
        printShops,
        config: {
          mapboxToken: mapboxToken,
          theme: store.settings?.widget_theme || 'light',
          defaultRadius: store.settings?.default_radius || 25,
          enableReusedApparel: store.settings?.enable_reused_apparel || true
        }
      })
    };

  } catch (error) {
    console.error('Error in widget-data function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to fetch widget data',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};