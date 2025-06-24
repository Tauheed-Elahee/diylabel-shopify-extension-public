import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productId = url.searchParams.get('product');

  if (!shopDomain) {
    throw new Response('Shop domain is required', { status: 400 });
  }

  // Get store settings
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (!store) {
    throw new Response('Store not found', { status: 404 });
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

  return json({
    store,
    productSettings,
    config: {
      mapboxToken: process.env.VITE_MAPBOX_TOKEN,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY
    }
  });
};

export default function Widget() {
  const { store, productSettings, config } = useLoaderData<typeof loader>();

  // Check if DIY Label is enabled for this product
  if (productSettings && !productSettings.diy_label_enabled) {
    return null; // Don't render widget if not enabled
  }

  const settings = store.settings || {};
  const theme = settings.widget_theme || 'light';
  const defaultRadius = settings.default_radius || 25;

  return (
    <div>
      <div 
        id="diy-label-widget"
        data-shop={store.shop_domain}
        data-product={productSettings?.shopify_product_id}
        data-theme={theme}
        data-radius={defaultRadius}
        data-config={JSON.stringify(config)}
        style={{
          width: '100%',
          minHeight: '500px',
          border: '1px solid #e1e1e1',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#000000',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            🌱 Choose Local Printing
          </h3>
          <p style={{ margin: '0 0 24px 0', color: theme === 'dark' ? '#cccccc' : '#666666' }}>
            Support your local community and reduce shipping impact by printing this item at a nearby shop.
          </p>
          
          <div id="location-status" style={{ 
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: theme === 'dark' ? '#333333' : '#f5f5f5',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              📍 Click "Find Print Shops" to get started
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button 
              id="find-shops-btn"
              style={{
                padding: '12px 24px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Find Print Shops Near Me
            </button>
          </div>

          <div id="map-container" style={{ 
            width: '100%', 
            height: '300px', 
            borderRadius: '8px',
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
            border: '1px solid #ddd',
            display: 'none',
            marginBottom: '20px'
          }}>
            <div id="map" style={{ width: '100%', height: '100%', borderRadius: '8px' }}></div>
          </div>

          <div id="shops-list" style={{ display: 'none' }}>
            <h4 style={{ margin: '20px 0 10px 0', fontSize: '16px', fontWeight: '600' }}>
              Nearby Print Shops
            </h4>
            <div id="shops-container"></div>
          </div>

          {settings.enable_reused_apparel && (
            <div style={{
              padding: '12px',
              backgroundColor: theme === 'dark' ? '#2d4a2d' : '#e8f5e8',
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                ♻️ Ask about printing on reused apparel for extra sustainability!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mapbox CSS */}
      <link 
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" 
        rel="stylesheet" 
      />

      {/* Mapbox JS */}
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            // DIY Label Widget Implementation
            (function() {
              const widget = document.getElementById('diy-label-widget');
              const config = JSON.parse(widget.dataset.config);
              const theme = widget.dataset.theme;
              const radius = parseInt(widget.dataset.radius) || 25;
              
              let map = null;
              let userLocation = null;
              let printShops = [];

              // DOM elements
              const findBtn = document.getElementById('find-shops-btn');
              const locationStatus = document.getElementById('location-status');
              const mapContainer = document.getElementById('map-container');
              const shopsList = document.getElementById('shops-list');
              const shopsContainer = document.getElementById('shops-container');

              // Update status message
              function updateStatus(message, isLoading = false) {
                locationStatus.innerHTML = '<p style="margin: 0; font-size: 14px; font-weight: 500;">' + 
                  (isLoading ? '⏳ ' : '📍 ') + message + '</p>';
              }

              // Get user's location
              function getUserLocation() {
                return new Promise((resolve, reject) => {
                  if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported'));
                    return;
                  }

                  updateStatus('Getting your location...', true);
                  
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                      });
                    },
                    (error) => {
                      reject(error);
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 300000 // 5 minutes
                    }
                  );
                });
              }

              // Fetch nearby print shops
              async function fetchPrintShops(lat, lng) {
                updateStatus('Finding nearby print shops...', true);
                
                try {
                  const response = await fetch(
                    '/api/print-shops/nearby?lat=' + lat + '&lng=' + lng + '&radius=' + radius
                  );
                  
                  if (!response.ok) {
                    throw new Error('Failed to fetch print shops');
                  }
                  
                  const data = await response.json();
                  return data.printShops || [];
                } catch (error) {
                  console.error('Error fetching print shops:', error);
                  throw error;
                }
              }

              // Initialize map
              function initMap(lat, lng) {
                if (!config.mapboxToken) {
                  console.error('Mapbox token not configured');
                  return;
                }

                mapboxgl.accessToken = config.mapboxToken;
                
                map = new mapboxgl.Map({
                  container: 'map',
                  style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10',
                  center: [lng, lat],
                  zoom: 11
                });

                // Add user location marker
                new mapboxgl.Marker({ color: '#007cba' })
                  .setLngLat([lng, lat])
                  .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Location</strong>'))
                  .addTo(map);

                return map;
              }

              // Add print shop markers to map
              function addPrintShopMarkers(shops) {
                shops.forEach((shop, index) => {
                  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                    '<div style="padding: 10px;">' +
                      '<h4 style="margin: 0 0 8px 0; font-size: 14px;">' + shop.name + '</h4>' +
                      '<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">' + shop.address + '</p>' +
                      '<p style="margin: 0 0 8px 0; font-size: 12px;">' + shop.specialty + '</p>' +
                      '<p style="margin: 0; font-size: 12px;"><strong>Rating:</strong> ' + shop.rating + '/5</p>' +
                      '<button onclick="selectPrintShop(' + index + ')" style="margin-top: 8px; padding: 6px 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Select This Shop</button>' +
                    '</div>'
                  );

                  new mapboxgl.Marker({ color: '#28a745' })
                    .setLngLat([shop.lng, shop.lat])
                    .setPopup(popup)
                    .addTo(map);
                });
              }

              // Display print shops list
              function displayPrintShops(shops) {
                if (shops.length === 0) {
                  shopsContainer.innerHTML = '<p style="text-align: center; color: #666;">No print shops found within ' + radius + ' miles. Try increasing the search radius.</p>';
                  return;
                }

                const shopsHtml = shops.map((shop, index) => 
                  '<div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: ' + (theme === 'dark' ? '#2a2a2a' : '#ffffff') + ';">' +
                    '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">' +
                      '<h4 style="margin: 0; font-size: 16px; font-weight: 600;">' + shop.name + '</h4>' +
                      '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">⭐ ' + shop.rating + '</span>' +
                    '</div>' +
                    '<p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">' + shop.address + '</p>' +
                    '<p style="margin: 0 0 8px 0; font-size: 14px;">' + shop.specialty + '</p>' +
                    '<p style="margin: 0 0 12px 0; font-size: 12px; color: #888;">Distance: ' + (shop.distance_km ? shop.distance_km.toFixed(1) + ' km' : 'Unknown') + '</p>' +
                    '<button onclick="selectPrintShop(' + index + ')" style="width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">Select This Print Shop</button>' +
                  '</div>'
                ).join('');

                shopsContainer.innerHTML = shopsHtml;
                shopsList.style.display = 'block';
              }

              // Select a print shop
              window.selectPrintShop = function(index) {
                const shop = printShops[index];
                updateStatus('Selected: ' + shop.name);
                
                // Here you would typically:
                // 1. Store the selection in localStorage or send to server
                // 2. Update the product page to show the selected print shop
                // 3. Modify the cart/checkout process
                
                alert('Print shop selected: ' + shop.name + '\\n\\nThis would normally integrate with your checkout process to route the order to this local print shop.');
              };

              // Main function to find and display print shops
              async function findPrintShops() {
                try {
                  findBtn.disabled = true;
                  findBtn.textContent = 'Finding...';
                  
                  // Get user location
                  userLocation = await getUserLocation();
                  
                  // Fetch nearby print shops
                  printShops = await fetchPrintShops(userLocation.lat, userLocation.lng);
                  
                  // Initialize map
                  initMap(userLocation.lat, userLocation.lng);
                  
                  // Add markers and display list
                  addPrintShopMarkers(printShops);
                  displayPrintShops(printShops);
                  
                  // Show map
                  mapContainer.style.display = 'block';
                  
                  updateStatus('Found ' + printShops.length + ' print shops near you');
                  
                } catch (error) {
                  console.error('Error finding print shops:', error);
                  updateStatus('Unable to find your location. Please enable location services and try again.');
                } finally {
                  findBtn.disabled = false;
                  findBtn.textContent = 'Find Print Shops Near Me';
                }
              }

              // Event listeners
              findBtn.addEventListener('click', findPrintShops);

              console.log('DIY Label Widget initialized for shop:', widget.dataset.shop);
              console.log('Product ID:', widget.dataset.product);
              console.log('Config:', config);
            })();
          `
        }}
      />
    </div>
  );
}