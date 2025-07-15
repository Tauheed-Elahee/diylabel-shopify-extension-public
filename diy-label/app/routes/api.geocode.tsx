import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');
  
  // CORS headers for cross-origin requests from checkout extensions
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  if (!address) {
    return json({ error: 'Address is required' }, { 
      status: 400,
      headers: corsHeaders
    });
  }
  
  try {
    console.log('Geocoding address:', address);
    
    // Use Mapbox Geocoding API
    const mapboxToken = process.env.VITE_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return json({ error: 'Geocoding service not configured' }, { 
        status: 500,
        headers: corsHeaders
      });
    }
    
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;
    
    const geocodingResponse = await fetch(geocodingUrl);
    
    if (!geocodingResponse.ok) {
      throw new Error(`Mapbox API error: ${geocodingResponse.status}`);
    }
    
    const data = await geocodingResponse.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      
      console.log('Geocoded successfully:', { lat, lng, address });
      
      return json({ 
        lat, 
        lng,
        address: data.features[0].place_name 
      }, {
        headers: corsHeaders
      });
    }
    
    console.log('No geocoding results found for:', address);
    return json({ error: 'Address not found' }, { 
      status: 404,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return json({ 
      error: 'Geocoding failed',
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