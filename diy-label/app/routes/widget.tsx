import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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

  if (!shopDomain) {
    throw new Response('Shop domain is required', { 
      status: 400,
      headers: corsHeaders
    });
  }

  // Get store settings
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (!store) {
    throw new Response('Store not found', { 
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

  return json({
    store,
    productSettings,
    config: {
      mapboxToken: process.env.VITE_MAPBOX_TOKEN,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY
    }
  }, {
    headers: corsHeaders
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
      {/* Mapbox CSS - Load first */}
      <link 
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" 
        rel="stylesheet" 
      />

      {/* Custom CSS for widget */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Widget Styles */
          .diy-label-widget-container {
            padding: 24px;
            color: ${theme === 'dark' ? '#ffffff' : '#000000'};
            font-family: system-ui, -apple-system, sans-serif;
            min-height: 500px;
            background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
          }

          /* Map Styles */
          .mapboxgl-map {
            width: 100% !important;
            height: 100% !important;
          }
          
          .mapboxgl-canvas-container {
            width: 100% !important;
            height: 100% !important;
          }
          
          .mapboxgl-canvas {
            width: 100% !important;
            height: 100% !important;
          }
          
          #map-container {
            position: relative;
            overflow: hidden;
          }
          
          #map {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }

          .location-error {
            background: #fee8e8;
            border: 1px solid #fcc;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #d32f2f;
          }

          .location-fallback {
            background: #e8f5e8;
            border: 1px solid #cce;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #2e7d32;
          }

          .manual-location {
            display: flex;
            gap: 10px;
            align-items: center;
            margin: 10px 0;
          }

          .manual-location input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }

          .manual-location button {
            padding: 8px 16px;
            background: #007cba;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }

          .manual-location button:hover {
            background: #005a8b;
          }

          /* Mobile Responsive */
          @media (max-width: 768px) {
            .diy-label-widget-container {
              padding: 20px;
            }
          }
        `
      }} />

      {/* Widget Container */}
      <div 
        id="diy-label-widget"
        className="diy-label-widget-container"
      >
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600' }}>
            🌱 Choose Local Printing
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: theme === 'dark' ? '#cccccc' : '#666666' }}>
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

          <div id="location-error" style={{ display: 'none' }}>
            <div className="location-error">
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📍 Location Access Needed</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
                We need your location to find nearby print shops. This might not work in embedded mode.
              </p>
              <div className="location-fallback">
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>
                  🔧 Try these options:
                </p>
                <div className="manual-location">
                  <input 
                    type="text" 
                    id="manual-location-input" 
                    placeholder="Enter your city or zip code"
                  />
                  <button id="search-by-location">Search</button>
                </div>
                <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Or <a href="#" id="open-in-new-tab" style={{ color: '#007cba', textDecoration: 'underline' }}>open in new tab</a> for full functionality
                </p>
              </div>
            </div>
          </div>

          <div id="map-container" style={{ 
            width: '100%', 
            height: '400px', 
            borderRadius: '8px',
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
            border: '1px solid #ddd',
            display: 'none',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div id="map" style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '8px',
              position: 'absolute',
              top: 0,
              left: 0
            }}></div>
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

      {/* Mapbox JS */}
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            // DIY Label Widget Implementation
            (function() {
              const config = ${JSON.stringify(config)};
              const theme = '${theme}';
              const radius = ${defaultRadius};
              
              let map = null;
              let userLocation = null;
              let printShops = [];

              // DOM elements
              const findBtn = document.getElementById('find-shops-btn');
              const locationStatus = document.getElementById('location-status');
              const locationError = document.getElementById('location-error');
              const mapContainer = document.getElementById('map-container');
              const shopsList = document.getElementById('shops-list');
              const shopsContainer = document.getElementById('shops-container');
              const manualLocationInput = document.getElementById('manual-location-input');
              const searchByLocationBtn = document.getElementById('search-by-location');
              const openInNewTabLink = document.getElementById('open-in-new-tab');

              // Update status message
              function updateStatus(message, isLoading = false) {
                locationStatus.innerHTML = '<p style="margin: 0; font-size: 14px; font-weight: 500;">' + 
                  (isLoading ? '⏳ ' : '📍 ') + message + '</p>';
              }

              // Show location error with fallback options
              function showLocationError(errorMessage) {
                updateStatus('Location access failed', false);
                locationError.style.display = 'block';
                console.log('Location error:', errorMessage);
              }

              // Hide location error
              function hideLocationError() {
                locationError.style.display = 'none';
              }

              // Geocode address using Mapbox
              async function geocodeAddress(address) {
                if (!config.mapboxToken) {
                  throw new Error('Mapbox token not configured');
                }

                try {
                  const response = await fetch(
                    'https://api.mapbox.com/geocoding/v5/mapbox.places/' + 
                    encodeURIComponent(address) + 
                    '.json?access_token=' + config.mapboxToken + 
                    '&country=US,CA&types=place,postcode,locality'
                  );
                  
                  if (!response.ok) {
                    throw new Error('Geocoding failed');
                  }
                  
                  const data = await response.json();
                  
                  if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    return { lat, lng };
                  } else {
                    throw new Error('Location not found');
                  }
                } catch (error) {
                  console.error('Geocoding error:', error);
                  throw error;
                }
              }

              // Get user's location with enhanced error handling
              function getUserLocation() {
                return new Promise((resolve, reject) => {
                  if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported by this browser'));
                    return;
                  }

                  updateStatus('Getting your location...', true);
                  
                  const options = {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 300000
                  };

                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      hideLocationError();
                      resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                      });
                    },
                    (error) => {
                      console.error('Geolocation error:', error);
                      let errorMessage = 'Location access failed';
                      
                      switch(error.code) {
                        case error.PERMISSION_DENIED:
                          errorMessage = 'Location access denied by user';
                          break;
                        case error.POSITION_UNAVAILABLE:
                          errorMessage = 'Location information unavailable';
                          break;
                        case error.TIMEOUT:
                          errorMessage = 'Location request timed out';
                          break;
                      }
                      
                      showLocationError(errorMessage);
                      reject(new Error(errorMessage));
                    },
                    options
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

                if (typeof mapboxgl === 'undefined') {
                  console.error('Mapbox GL JS not loaded');
                  return;
                }

                mapboxgl.accessToken = config.mapboxToken;
                
                map = new mapboxgl.Map({
                  container: 'map',
                  style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10',
                  center: [lng, lat],
                  zoom: 11,
                  attributionControl: true
                });

                map.on('load', function() {
                  console.log('Map loaded successfully');
                  setTimeout(() => {
                    map.resize();
                  }, 100);
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
                if (!map) return;
                
                shops.forEach((shop, index) => {
                  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                    '<div style="padding: 10px; max-width: 200px;">' +
                      '<h4 style="margin: 0 0 8px 0; font-size: 14px;">' + shop.name + '</h4>' +
                      '<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">' + shop.address + '</p>' +
                      '<p style="margin: 0 0 8px 0; font-size: 12px;">' + shop.specialty + '</p>' +
                      '<p style="margin: 0; font-size: 12px;"><strong>Rating:</strong> ' + shop.rating + '/5</p>' +
                      '<button onclick="selectPrintShop(' + index + ')" style="margin-top: 8px; padding: 6px 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Select This Shop</button>' +
                    '</div>'
                  );

                  new mapboxgl.Marker({ color: '#28a745' })
                    .setLngLat([shop.lng, shop.lat])
                    .setPopup(popup)
                    .addTo(map);
                });

                // Fit map to show all markers
                if (shops.length > 0) {
                  const bounds = new mapboxgl.LngLatBounds();
                  
                  bounds.extend([userLocation.lng, userLocation.lat]);
                  
                  shops.forEach(shop => {
                    bounds.extend([shop.lng, shop.lat]);
                  });
                  
                  map.fitBounds(bounds, { padding: 50 });
                }
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
                
                // Create actual order instead of just showing alert
                createDIYLabelOrder(shop);
              };
              
              // Function to create DIY Label order
              async function createDIYLabelOrder(printShop) {
                try {
                  updateStatus('Creating order with ' + printShop.name + '...', true);
                  
                  // Get product ID from URL or widget data
                  const urlParams = new URLSearchParams(window.location.search);
                  const productId = urlParams.get('product');
                  const shopDomain = urlParams.get('shop');
                  
                  if (!productId || !shopDomain) {
                    throw new Error('Missing product ID or shop domain');
                  }
                  
                  // Create order data
                  const orderData = {
                    shopifyOrderId: 'widget-order-' + Date.now(),
                    shopDomain: shopDomain,
                    printShopId: printShop.id,
                    productData: {
                      title: 'Product from Widget',
                      product_id: productId,
                      total: 25.00 // This would come from the actual product
                    },
                    customerData: {
                      name: 'Widget Customer',
                      email: 'customer@example.com'
                      // In a real implementation, this would come from the checkout
                    },
                    options: {
                      source: 'widget',
                      user_location: userLocation
                    }
                  };
                  
                  // Send order to API
                  const response = await fetch('/api/orders/diy-label', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok && result.success) {
                    updateStatus('Order created successfully!');
                    
                    // Show success message
                    const successMessage = 'Order created with ' + printShop.name + '!\\n\\n' +
                      'Order ID: ' + result.order.id + '\\n' +
                      'Status: ' + result.order.status + '\\n' +
                      'Estimated completion: ' + result.order.estimatedCompletion;
                    
                    alert(successMessage);
                  } else {
                    throw new Error(result.error || 'Failed to create order');
                  }
                  
                } catch (error) {
                  console.error('Error creating order:', error);
                  updateStatus('Failed to create order');
                  alert('Error creating order: ' + error.message + '\\n\\nThis is a demo - in a real store, this would integrate with your checkout process.');
                }
              }

              // Main function to find and display print shops
              async function findPrintShops() {
                try {
                  findBtn.disabled = true;
                  findBtn.textContent = 'Finding...';
                  hideLocationError();
                  
                  userLocation = await getUserLocation();
                  printShops = await fetchPrintShops(userLocation.lat, userLocation.lng);
                  
                  mapContainer.style.display = 'block';
                  
                  setTimeout(() => {
                    initMap(userLocation.lat, userLocation.lng);
                    
                    setTimeout(() => {
                      addPrintShopMarkers(printShops);
                      displayPrintShops(printShops);
                    }, 1000);
                  }, 100);
                  
                  updateStatus('Found ' + printShops.length + ' print shops near you');
                  
                } catch (error) {
                  console.error('Error finding print shops:', error);
                } finally {
                  findBtn.disabled = false;
                  findBtn.textContent = 'Find Print Shops Near Me';
                }
              }

              // Search by manual location
              async function searchByManualLocation() {
                const address = manualLocationInput.value.trim();
                if (!address) {
                  alert('Please enter a city or zip code');
                  return;
                }

                try {
                  searchByLocationBtn.disabled = true;
                  searchByLocationBtn.textContent = 'Searching...';
                  hideLocationError();
                  
                  updateStatus('Finding location: ' + address, true);
                  
                  userLocation = await geocodeAddress(address);
                  printShops = await fetchPrintShops(userLocation.lat, userLocation.lng);
                  
                  mapContainer.style.display = 'block';
                  
                  setTimeout(() => {
                    initMap(userLocation.lat, userLocation.lng);
                    
                    setTimeout(() => {
                      addPrintShopMarkers(printShops);
                      displayPrintShops(printShops);
                    }, 1000);
                  }, 100);
                  
                  updateStatus('Found ' + printShops.length + ' print shops near ' + address);
                  
                } catch (error) {
                  console.error('Error searching by location:', error);
                  updateStatus('Could not find location: ' + address);
                  alert('Could not find that location. Please try a different city or zip code.');
                } finally {
                  searchByLocationBtn.disabled = false;
                  searchByLocationBtn.textContent = 'Search';
                }
              }

              // Open widget in new tab
              function openInNewTab() {
                const currentUrl = window.location.href;
                window.open(currentUrl, '_blank');
              }

              // Event listeners
              findBtn.addEventListener('click', findPrintShops);
              searchByLocationBtn.addEventListener('click', searchByManualLocation);
              openInNewTabLink.addEventListener('click', function(e) {
                e.preventDefault();
                openInNewTab();
              });

              // Allow Enter key in manual location input
              manualLocationInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                  searchByManualLocation();
                }
              });

              console.log('DIY Label Widget initialized');
            })();
          `
        }}
      />
    </div>
  );
}