import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    debugInfo: {
      checkoutExtensionDebugging: true,
      apiEndpoints: [
        'https://diylabel.netlify.app/.netlify/functions/checkout-order',
        'https://diylabel.netlify.app/api/checkout/diy-label'
      ]
    }
  });
};

export default function DebugCheckoutExtension() {
  const data = useLoaderData<typeof loader>();

  const testCheckoutExtensionAPI = async () => {
    const testData = {
      shopifyOrderId: `checkout-ext-test-${Date.now()}`,
      shopDomain: 'diy-label.myshopify.com',
      printShopId: 1,
      productData: {
        line_items: [{
          id: "checkout-ext-test-1",
          quantity: 1,
          title: "Checkout Extension Test Product",
          variant_id: "test-variant-checkout"
        }],
        total: 25.00,
        currency: "USD"
      },
      customerData: {
        name: "Checkout Extension Test",
        email: "checkout-ext-test@example.com",
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
        source: "checkout_extension_debug",
        test: true,
        created_at: new Date().toISOString()
      }
    };

    console.log('Testing checkout extension API with:', testData);

    try {
      const response = await fetch('https://diylabel.netlify.app/.netlify/functions/checkout-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        alert(`❌ Invalid JSON response:\n${responseText}`);
        return;
      }

      console.log('Parsed result:', result);

      if (response.ok && result.success) {
        alert(`✅ Checkout Extension API Test Successful!\n\nOrder ID: ${result.order.id}\nPrint Shop: ${result.order.printShop}\nStatus: ${result.order.status}\nSource: ${result.order.source}`);
      } else {
        alert(`❌ API Test Failed:\n\nStatus: ${response.status}\nError: ${result.error || 'Unknown error'}\nDetails: ${result.details || 'No details'}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert(`❌ Network Error:\n${error.message}`);
    }
  };

  const testAPIConnectivity = async () => {
    try {
      console.log('Testing basic API connectivity...');
      
      // Test 1: Nearby shops API
      const nearbyResponse = await fetch('https://diylabel.netlify.app/.netlify/functions/nearby-shops?lat=43.6532&lng=-79.3832&radius=25');
      const nearbyData = await nearbyResponse.json();
      console.log('Nearby shops API test:', nearbyData);
      
      // Test 2: Widget data API
      const widgetResponse = await fetch('https://diylabel.netlify.app/.netlify/functions/widget-data?shop=diy-label.myshopify.com');
      const widgetData = await widgetResponse.json();
      console.log('Widget data API test:', widgetData);
      
      alert(`✅ API Connectivity Test Results:
      
Nearby Shops API: ${nearbyResponse.ok ? 'Working' : 'Failed'}
- Found ${nearbyData.printShops?.length || 0} print shops

Widget Data API: ${widgetResponse.ok ? 'Working' : 'Failed'}
- Store found: ${widgetData.store ? 'Yes' : 'No'}

Check console for detailed results.`);
      
    } catch (error) {
      console.error('API connectivity test failed:', error);
      alert(`❌ API Connectivity Test Failed:\n${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🔍 Checkout Extension Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
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

      <div style={{ 
        padding: '20px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>🎯 Purpose</h2>
        <p>This page helps debug why the Checkout UI Extension isn't creating orders in the database, even though the test API works.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Test Actions</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #007cba',
            borderRadius: '8px'
          }}>
            <h3>1. Test Checkout Extension API</h3>
            <p>This simulates exactly what the checkout extension should do.</p>
            <button
              onClick={testCheckoutExtensionAPI}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Test Checkout Extension API
            </button>
          </div>

          <div style={{ 
            padding: '20px', 
            border: '1px solid '#28a745',
            borderRadius: '8px'
          }}>
            <h3>2. Test API Connectivity</h3>
            <p>Verify that all Netlify functions are accessible.</p>
            <button
              onClick={testAPIConnectivity}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Test API Connectivity
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 Debugging Checklist</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h4>If checkout extension isn't creating orders:</h4>
          <ol>
            <li><strong>Check browser console</strong> in checkout for errors</li>
            <li><strong>Verify extension is deployed</strong>: <code>shopify app deploy</code></li>
            <li><strong>Test API endpoints</strong> using buttons above</li>
            <li><strong>Check CORS settings</strong> on Netlify functions</li>
            <li><strong>Verify cart attributes</strong> are being set correctly</li>
            <li><strong>Test in different browsers</strong> (Chrome, Firefox, Safari)</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Current Status</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <p><strong>Test API:</strong> ✅ Working (orders appear in dashboard)</p>
          <p><strong>Checkout Extension:</strong> ❌ Not creating orders</p>
          <p><strong>Database:</strong> ✅ Connected and working</p>
          <p><strong>Netlify Functions:</strong> ✅ Deployed and accessible</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/app/orders">View Orders Dashboard</a></li>
          <li><a href="/test-checkout-order">Test Checkout Order API</a></li>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="https://diylabel.netlify.app/.netlify/functions/checkout-order" target="_blank">Direct API Endpoint</a></li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '4px'
      }}>
        <h4>💡 Next Steps</h4>
        <p>
          1. Run the tests above to verify API connectivity<br/>
          2. Deploy the updated checkout extension<br/>
          3. Test in actual checkout with browser console open<br/>
          4. Check for any CORS or network errors
        </p>
      </div>
    </div>
  );
}