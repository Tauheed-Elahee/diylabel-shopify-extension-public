const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { address } = event.queryStringParameters || {};
  
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
  
  if (!address) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Address is required' })
    };
  }
  
  try {
    console.log('Geocoding address:', address);
    
    // Use Mapbox Geocoding API
    const mapboxToken = process.env.VITE_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Geocoding service not configured' })
      };
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
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({ 
          lat, 
          lng,
          address: data.features[0].place_name 
        })
      };
    }
    
    console.log('No geocoding results found for:', address);
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Address not found' })
    };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};