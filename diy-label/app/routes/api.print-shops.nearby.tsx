import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get('lat') || '0');
  const lng = parseFloat(url.searchParams.get('lng') || '0');
  const radius = parseInt(url.searchParams.get('radius') || '25');

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    // Use PostGIS to find nearby print shops
    // This is a simplified distance calculation - in production you'd use proper PostGIS functions
    const { data: printShops, error } = await supabaseAdmin
      .from('print_shops')
      .select('*')
      .eq('active', true);

    if (error) {
      throw error;
    }

    // Calculate distances and filter by radius
    const nearbyShops = printShops
      ?.map(shop => {
        const distance = calculateDistance(lat, lng, shop.latitude, shop.longitude);
        return { ...shop, distance };
      })
      .filter(shop => shop.distance <= radius)
      .sort((a, b) => a.distance - b.distance) || [];

    return json({
      printShops: nearbyShops,
      center: { lat, lng },
      radius
    });
  } catch (error) {
    console.error('Error fetching nearby print shops:', error);
    return json({ error: 'Failed to fetch print shops' }, { status: 500 });
  }
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}