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

exports.handler = async (event, context) => {
  // Set CORS headers for all responses
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

  const { lat, lng, radius } = event.queryStringParameters || {};

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const parsedRadius = parseInt(radius || '25');

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Latitude and longitude are required and must be numbers' })
    };
  }

  try {
    console.log(`Fetching nearby print shops for lat: ${parsedLat}, lng: ${parsedLng}, radius: ${parsedRadius}`);

    // Use your existing get_nearby_print_shops function
    const { data: printShops, error } = await supabaseAdmin
      .rpc('get_nearby_print_shops', {
        user_lat: parsedLat,
        user_lng: parsedLng,
        radius_km: parsedRadius
      });

    if (error) {
      console.error('Supabase RPC error:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Failed to fetch print shops from database', 
          details: error.message 
        })
      };
    }

    // Filter only active shops
    const activeShops = printShops?.filter(shop => shop.active !== false) || [];

    console.log(`Found ${activeShops.length} active print shops`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        printShops: activeShops,
        center: { lat: parsedLat, lng: parsedLng },
        radius: parsedRadius,
        count: activeShops.length
      })
    };
  } catch (error) {
    console.error('Error in nearby-shops function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      })
    };
  }
};