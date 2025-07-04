import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get available print shops for testing
  const { data: printShops } = await supabaseAdmin
    .from('print_shops')
    .select('id, name, address')
    .eq('active', true)
    .limit(5);

  // Get available stores for testing
  const { data: stores } = await supabaseAdmin
    .from('shopify_stores')
    .select('shop_domain')
    .eq('active', true)
    .limit(5);

  return json({
    printShops: printShops || [],
    stores: stores || []
  });
};

export default function TestOrderCreation() {
  const { printShops, stores } = useLoaderData<typeof loader>();
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

    fetcher.submit(testData, {
      method: 'POST',
      action: '/api/orders/diy-label',
      encType: 'application/json'
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>Test Order Creation API</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Available Test Data</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Print Shops ({printShops.length})</h3>
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
          <h3>Stores ({stores.length})</h3>
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
        <h2>Test Order Creation</h2>
        <button 
          onClick={testOrderCreation}
          disabled={fetcher.state === 'submitting' || printShops.length === 0 || stores.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: (fetcher.state === 'submitting' || printShops.length === 0 || stores.length === 0) ? 0.6 : 1
          }}
        >
          {fetcher.state === 'submitting' ? 'Creating Test Order...' : 'Create Test Order'}
        </button>
      </div>

      {fetcher.data && (
        <div style={{ marginBottom: '30px' }}>
          <h2>API Response</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: fetcher.data.success ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${fetcher.data.success ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <pre style={{ margin: 0, fontSize: '14px', overflow: 'auto' }}>
              {JSON.stringify(fetcher.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Manual API Test</h3>
        <p>You can also test the API directly with curl:</p>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
{`curl -X POST ${window.location.origin}/api/orders/diy-label \\
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
        <h3>Quick Links</h3>
        <ul>
          <li><a href="/app">Back to Dashboard</a></li>
          <li><a href="/diagnose-db">Check Database</a></li>
          <li><a href="/debug-dashboard">Debug Dashboard</a></li>
        </ul>
      </div>
    </div>
  );
}