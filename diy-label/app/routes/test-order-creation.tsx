import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get available print shops for testing
    const { data: printShops, error: printShopsError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, address')
      .eq('active', true)
      .limit(5);

    if (printShopsError) {
      console.error('Error fetching print shops:', printShopsError);
    }

    // Get available stores for testing
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('shopify_stores')
      .select('shop_domain')
      .eq('active', true)
      .limit(5);

    if (storesError) {
      console.error('Error fetching stores:', storesError);
    }

    return json({
      printShops: printShops || [],
      stores: stores || [],
      errors: {
        printShops: printShopsError?.message,
        stores: storesError?.message
      }
    });
  } catch (error) {
    console.error('Loader error:', error);
    return json({
      printShops: [],
      stores: [],
      errors: {
        general: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export default function TestOrderCreation() {
  const { printShops, stores, errors } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const testOrderCreation = () => {
    if (printShops.length === 0 || stores.length === 0) {
      alert('No print shops or stores available for testing');
      return;
    }

    const testData = {
      shopifyOrderId: `test-order-${Date.now()}`,
      shopDomain: stores[0].shop_domain,
      printShopId: printShops[0].id,
      productData: {
        title: "Test T-Shirt",
        handle: "test-t-shirt",
        total: 25.00,
        quantity: 1,
        variant_id: "test-variant-123"
      },
      customerData: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "+1234567890",
        address: {
          address1: "123 Test St",
          city: "Test City",
          province: "CA",
          zip: "12345",
          country: "US"
        }
      },
      options: {
        reused_apparel: false,
        rush_order: false,
        special_instructions: "This is a test order"
      }
    };

    console.log('Sending test order data:', testData);

    // Use fetch instead of fetcher.submit for better control
    fetch('/api/orders/diy-label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Order creation response:', data);
      if (data.success) {
        alert(`✅ Order created successfully!\n\nOrder ID: ${data.order.id}\nPrint Shop: ${data.order.printShop}\nStatus: ${data.order.status}`);
      } else {
        alert(`❌ Order creation failed:\n${data.error}\n\nDetails: ${data.details || 'No additional details'}`);
      }
    })
    .catch(error => {
      console.error('Order creation error:', error);
      alert(`❌ Network error:\n${error.message}`);
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧪 Test Order Creation API</h1>
      
      {errors.general && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>⚠️ General Error:</strong> {errors.general}
        </div>
      )}
      
      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Available Test Data</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>🏪 Print Shops ({printShops.length})</h3>
          {errors.printShops && (
            <p style={{ color: 'red' }}>Error loading print shops: {errors.printShops}</p>
          )}
          {printShops.length > 0 ? (
            <ul>
              {printShops.map(shop => (
                <li key={shop.id}>
                  <strong>ID {shop.id}:</strong> {shop.name} - {shop.address}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'red' }}>❌ No print shops found. Check your database.</p>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>🛍️ Stores ({stores.length})</h3>
          {errors.stores && (
            <p style={{ color: 'red' }}>Error loading stores: {errors.stores}</p>
          )}
          {stores.length > 0 ? (
            <ul>
              {stores.map(store => (
                <li key={store.shop_domain}>
                  {store.shop_domain}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'red' }}>❌ No stores found. Install the app on a test store first.</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚀 Test Order Creation</h2>
        <button 
          onClick={testOrderCreation}
          disabled={printShops.length === 0 || stores.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: (printShops.length === 0 || stores.length === 0) ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: (printShops.length === 0 || stores.length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          Create Test Order
        </button>
        
        {(printShops.length === 0 || stores.length === 0) && (
          <p style={{ color: 'orange', marginTop: '10px' }}>
            ⚠️ Cannot test: Missing print shops or stores. Check the database and ensure the app is installed on a test store.
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>📋 Manual API Test</h3>
        <p>You can also test the API directly with curl:</p>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'YOUR_TUNNEL_URL'}/api/orders/diy-label \\
  -H "Content-Type: application/json" \\
  -d '{
    "shopifyOrderId": "test-order-${Date.now()}",
    "shopDomain": "${stores[0]?.shop_domain || 'your-store.myshopify.com'}",
    "printShopId": ${printShops[0]?.id || 1},
    "productData": {
      "title": "Test T-Shirt",
      "total": 25.00
    },
    "customerData": {
      "name": "Test Customer",
      "email": "test@example.com"
    }
  }'`}
        </pre>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/app">Back to Dashboard</a></li>
          <li><a href="/diagnose-db">Check Database</a></li>
          <li><a href="/debug-dashboard">Debug Dashboard</a></li>
          <li><a href="/api/print-shops/nearby?lat=37.7749&lng=-122.4194&radius=25">Test Print Shops API</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h3>💡 Troubleshooting Tips</h3>
        <ul>
          <li><strong>No print shops:</strong> Check if the database migration ran successfully</li>
          <li><strong>No stores:</strong> Install the app on a Shopify development store</li>
          <li><strong>API errors:</strong> Check the browser console and server logs</li>
          <li><strong>404 errors:</strong> Ensure the development server is running</li>
        </ul>
      </div>
    </div>
  );
}