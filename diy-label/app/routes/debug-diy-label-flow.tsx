import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop') || 'diy-label.myshopify.com';

  try {
    // 1. Check if store exists and is active
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    // 2. Check product settings
    const { data: productSettings, error: productError } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store?.id || '')
      .eq('diy_label_enabled', true);

    // 3. Check print shops
    const { data: printShops, error: printShopsError } = await supabaseAdmin
      .from('print_shops')
      .select('*')
      .eq('active', true)
      .limit(5);

    return json({
      store: store || null,
      storeError: storeError?.message,
      productSettings: productSettings || [],
      productError: productError?.message,
      printShops: printShops || [],
      printShopsError: printShopsError?.message,
      shopDomain,
      debugSteps: [
        '1. Store lookup',
        '2. Product settings check',
        '3. Print shops availability',
        '4. Cart attributes test',
        '5. Function deployment status'
      ]
    });

  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
      shopDomain
    });
  }
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'test-cart-update') {
    // Test cart update functionality
    return json({
      success: true,
      message: 'Cart update test completed - check browser console'
    });
  }

  return json({ success: false, error: 'Invalid action' });
};

export default function DebugDIYLabelFlow() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const testCartUpdate = () => {
    // This will run in the browser to test cart updates
    const testScript = `
      // Test cart attribute update
      fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            'diy_label_enabled': 'true',
            'diy_label_print_shop_id': '1',
            'diy_label_print_shop_name': 'Test Print Shop',
            'diy_label_print_shop_address': '123 Test St'
          }
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Cart update result:', data);
        alert('Cart updated! Check console for details.');
      })
      .catch(error => {
        console.error('Cart update error:', error);
        alert('Cart update failed: ' + error.message);
      });
    `;
    
    eval(testScript);
  };

  const checkCartAttributes = () => {
    const checkScript = `
      fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
          console.log('Current cart attributes:', cart.attributes);
          const diyEnabled = cart.attributes?.diy_label_enabled;
          const printShop = cart.attributes?.diy_label_print_shop_name;
          
          alert('DIY Label Enabled: ' + (diyEnabled || 'false') + '\\nPrint Shop: ' + (printShop || 'none'));
        })
        .catch(error => {
          console.error('Error checking cart:', error);
          alert('Error checking cart: ' + error.message);
        });
    `;
    
    eval(checkScript);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px' }}>
      <h1>🔍 DIY Label Integration Debug</h1>
      
      {data.error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {data.error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>📊 System Status</h2>
        
        {/* Store Status */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{data.store ? '✅' : '❌'} Store Connection</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.store ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${data.store ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            {data.store ? (
              <>
                <p><strong>Shop Domain:</strong> {data.store.shop_domain}</p>
                <p><strong>Store ID:</strong> {data.store.id}</p>
                <p><strong>Active:</strong> {data.store.active ? 'Yes' : 'No'}</p>
                <p><strong>Created:</strong> {new Date(data.store.created_at).toLocaleDateString()}</p>
              </>
            ) : (
              <p><strong>Error:</strong> {data.storeError || 'Store not found'}</p>
            )}
          </div>
        </div>

        {/* Product Settings */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{data.productSettings.length > 0 ? '✅' : '❌'} Product Settings</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.productSettings.length > 0 ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${data.productSettings.length > 0 ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <p><strong>DIY Label Enabled Products:</strong> {data.productSettings.length}</p>
            {data.productSettings.length > 0 ? (
              <ul>
                {data.productSettings.map(setting => (
                  <li key={setting.id}>
                    Product ID: {setting.shopify_product_id} 
                    {setting.allow_reused_apparel && ' (Reused Apparel)'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No products have DIY Label enabled. Enable products in the admin dashboard first.</p>
            )}
            {data.productError && <p><strong>Error:</strong> {data.productError}</p>}
          </div>
        </div>

        {/* Print Shops */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{data.printShops.length > 0 ? '✅' : '❌'} Print Shops</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.printShops.length > 0 ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${data.printShops.length > 0 ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <p><strong>Active Print Shops:</strong> {data.printShops.length}</p>
            {data.printShops.length > 0 ? (
              <ul>
                {data.printShops.slice(0, 3).map(shop => (
                  <li key={shop.id}>
                    {shop.name} - {shop.address} (Rating: {shop.rating}/5)
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active print shops found. The widget won't work without print shops.</p>
            )}
            {data.printShopsError && <p><strong>Error:</strong> {data.printShopsError}</p>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Interactive Tests</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #007cba',
            borderRadius: '4px'
          }}>
            <h3>1. Test Cart Attribute Update</h3>
            <p>This will simulate selecting a print shop and updating cart attributes.</p>
            <button
              onClick={testCartUpdate}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Cart Update
            </button>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #28a745',
            borderRadius: '4px'
          }}>
            <h3>2. Check Current Cart Attributes</h3>
            <p>This will show what's currently stored in the cart.</p>
            <button
              onClick={checkCartAttributes}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Check Cart Attributes
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Manual Test URLs</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h4>Test the Widget Directly:</h4>
          <p>
            <a 
              href={`/widget?shop=${data.shopDomain}&product=test`}
              target="_blank"
              style={{ color: '#007cba', textDecoration: 'none' }}
            >
              Open DIY Label Widget →
            </a>
          </p>
          
          <h4>Test Product Settings API:</h4>
          <p>
            <a 
              href={`/api/product-settings?shop=${data.shopDomain}&product=test`}
              target="_blank"
              style={{ color: '#007cba', textDecoration: 'none' }}
            >
              Check Product Settings API →
            </a>
          </p>
          
          <h4>Test Print Shops API:</h4>
          <p>
            <a 
              href={`/api/print-shops/nearby?lat=37.7749&lng=-122.4194&radius=25`}
              target="_blank"
              style={{ color: '#007cba', textDecoration: 'none' }}
            >
              Check Print Shops API →
            </a>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Debugging Checklist</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h4>Step-by-Step Debugging:</h4>
          <ol>
            <li><strong>✅ Store Connected:</strong> {data.store ? 'Yes' : 'No'}</li>
            <li><strong>✅ Products Enabled:</strong> {data.productSettings.length > 0 ? 'Yes' : 'No'}</li>
            <li><strong>✅ Print Shops Available:</strong> {data.printShops.length > 0 ? 'Yes' : 'No'}</li>
            <li><strong>🔄 Theme Extension Deployed:</strong> Check in Shopify admin</li>
            <li><strong>🔄 Function Deployed:</strong> Run `shopify app deploy`</li>
            <li><strong>🔄 Cart Attributes Set:</strong> Use "Test Cart Update" button above</li>
            <li><strong>🔄 Checkout Function Working:</strong> Check in checkout after cart update</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚀 Next Steps</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px'
        }}>
          <h4>If local pickup still doesn't appear:</h4>
          <ol>
            <li><strong>Deploy the function:</strong> Run `shopify app deploy` in terminal</li>
            <li><strong>Enable a product:</strong> Go to admin dashboard and enable DIY Label for a product</li>
            <li><strong>Test cart update:</strong> Use the "Test Cart Update" button above</li>
            <li><strong>Check cart attributes:</strong> Use the "Check Cart Attributes" button</li>
            <li><strong>Go to checkout:</strong> Add the enabled product to cart and go to checkout</li>
            <li><strong>Look for pickup option:</strong> Should appear as "🌱 Local Print Shop Pickup - FREE"</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/app">Admin Dashboard</a></li>
          <li><a href="/diagnose-db">Database Diagnosis</a></li>
          <li><a href="/test-order-creation">Test Order Creation</a></li>
        </ul>
      </div>
    </div>
  );
}