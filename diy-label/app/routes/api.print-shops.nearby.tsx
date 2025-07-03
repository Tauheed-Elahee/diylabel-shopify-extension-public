import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
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

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude are required' }, { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Use your existing get_nearby_print_shops function!
    const { data: printShops, error } = await supabaseAdmin
      .rpc('get_nearby_print_shops', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radius
      });

    if (error) {
      throw error;
    }

    // Filter only active shops (if you have the active column)
    const activeShops = printShops?.filter(shop => shop.active !== false) || [];

    return json({
      printShops: activeShops,
      center: { lat, lng },
      radius,
      count: activeShops.length
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error fetching nearby print shops:', error);
    return json({ 
      error: 'Failed to fetch print shops',
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