import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get available print shops for testing
    const { data: printShops, error: printShopsError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, address')
      .limit(5);

    if (printShopsError) {
      console.error('Error fetching print shops:', printShopsError);
    }

    // Get available stores for testing
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('shopify_stores')
      .select('shop_domain')
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

export default function TestCheckoutOrder() {
  const { printShops, stores, errors } = useLoaderData<typeof loader>();

  const testCheckoutOrder = () => {
    if (printShops.length === 0 || stores.length === 0) {
      alert('No print shops or stores available for testing');
      return;
    }

    const testData = {
      shopifyOrderId: `checkout-test-${Date.now()}`,
      shopDomain: stores[0].shop_domain,
      printShopId: printShops[0].id,
      productData: {
        line_items: [{
          id: "test-line-item-1",
          quantity: 1,
          title: "Test T-Shirt from Checkout",
          variant_id: "test-variant-123"
        }],
        total: 25.00,
        currency: "USD"
      },
      customerData: {
        name: "Checkout Test Customer",
        email: "checkout-test@example.com",
        shipping_address: {
          address1: "123 Test St",
          city: "Test City",
          province: "CA",
          zip: "12345",
          country: "US"
        },
        customer_location: "123 Test St, Test City, CA, US, 12345"
      },
      options: {
        source: "checkout_extension",
        test: true,
        created_at: new Date().toISOString()
      }
    };

    console.log('Testing checkout order creation with:', testData);

    // Test the checkout-order endpoint
    fetch('https://diylabel.netlify.app/.netlify/functions/checkout-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Checkout order response:', data);
      if (data.success) {
        alert(`✅ Checkout order created successfully!\n\nOrder ID: ${data.order.id}\nPrint Shop: ${data.order.printShop}\nStatus: ${data.order.status}\nSource: ${data.order.source}`);
      } else {
        alert(`❌ Checkout order creation failed:\n${data.error}\n\nDetails: ${data.details || 'No additional details'}`);
      }
    })
    .catch(error => {
      console.error('Checkout order error:', error);
      alert(`❌ Network error:\n${error.message}`);
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧪 Test Checkout Order Creation</h1>
      
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
        <h2>🚀 Test Checkout Order Creation</h2>
        <p>This tests the <code>checkout-order</code> Netlify function that the checkout extension uses.</p>
        <button 
          onClick={testCheckoutOrder}
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
          Test Checkout Order Creation
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
{`curl -X POST https://diylabel.netlify.app/.netlify/functions/checkout-order \\
  -H "Content-Type: application/json" \\
  -d '{
    "shopifyOrderId": "checkout-test-${Date.now()}",
    "shopDomain": "${stores[0]?.shop_domain || 'diy-label.myshopify.com'}",
    "printShopId": ${printShops[0]?.id || 1},
    "productData": {
      "line_items": [{"id": "test-1", "quantity": 1, "title": "Test Product"}],
      "total": 25.00,
      "currency": "USD"
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
        <div style={{ marginBottom: '15px' }}>
          <a href="/debug-index" style={{ 
            padding: '8px 16px', 
            backgroundColor: '#007cba', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            ← Back to Debug Center
          </a>
        </div>
        <ul>
          <li><a href="/app">App Dashboard</a></li>
          <li><a href="/app/orders">Orders Page</a></li>
          <li><a href="/test-order-creation">Test Regular Order Creation</a></li>
          <li><a href="/diagnose-db">Check Database</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h3>💡 Troubleshooting Tips</h3>
        <ul>
          <li><strong>Orders not appearing:</strong> Check if the store domain matches exactly</li>
          <li><strong>Print shop not found:</strong> Verify print shop IDs exist in database</li>
          <li><strong>Network errors:</strong> Check Netlify function logs</li>
          <li><strong>Database errors:</strong> Verify Supabase connection and table structure</li>
        </ul>
      </div>
    </div>
  );
}