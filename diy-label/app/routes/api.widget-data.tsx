import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productId = url.searchParams.get('product');
  const lat = parseFloat(url.searchParams.get('lat') || '0');
  const lng = parseFloat(url.searchParams.get('lng') || '0');
  const radius = parseInt(url.searchParams.get('radius') || '25');

  // CORS headers for cross-origin requests from Shopify stores
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (!shopDomain) {
    return json({ error: 'Shop domain is required' }, { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Get store settings
    const { data: store } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    if (!store) {
      return json({ error: 'Store not found' }, { 
        status: 404,
        headers: corsHeaders
      });
    }

    // Get product settings if productId is provided
    let productSettings = null;
    if (productId) {
      const { data } = await supabaseAdmin
        .from('product_settings')
        .select('*')
        .eq('shopify_store_id', store.id)
        .eq('shopify_product_id', productId)
        .single();
      
      productSettings = data;
    }

    // Get nearby print shops if location is provided
    let printShops = [];
    if (lat && lng) {
      const { data: nearbyShops, error } = await supabaseAdmin
        .rpc('get_nearby_print_shops', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radius
        });

      if (!error && nearbyShops) {
        printShops = nearbyShops.filter(shop => shop.active !== false);
      }
    }

    return json({
      store: {
        shop_domain: store.shop_domain,
        settings: store.settings || {}
      },
      productSettings,
      printShops,
      config: {
        mapboxToken: process.env.VITE_MAPBOX_TOKEN,
        theme: store.settings?.widget_theme || 'light',
        defaultRadius: store.settings?.default_radius || 25,
        enableReusedApparel: store.settings?.enable_reused_apparel || true
      }
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in widget-data API:', error);
    return json({ 
      error: 'Failed to fetch widget data',
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