import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    steps: [
      'Deploy the function to Shopify',
      'Verify function is active',
      'Test with cart attributes',
      'Check checkout for pickup option'
    ]
  });
};

export default function DebugFunctionDeployment() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🚀 Function Deployment Debug</h1>
      
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
        backgroundColor: '#e8f5e8',
        border: '1px solid #4caf50',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>✅ Cart Attributes Working!</h2>
        <p>Your cart attributes are being set correctly. The issue is that the Shopify Function needs to be deployed.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Deploy the Function</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Step 1: Deploy to Shopify</h3>
          <p>Run this command in your terminal:</p>
          <div style={{ 
            backgroundColor: '#2d3748', 
            color: '#e2e8f0', 
            padding: '15px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            margin: '10px 0'
          }}>
            cd diy-label<br/>
            shopify app deploy
          </div>
          <p><strong>This will:</strong></p>
          <ul>
            <li>Deploy your local pickup function to Shopify</li>
            <li>Make it available in checkout</li>
            <li>Enable the pickup option generation</li>
          </ul>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Step 2: Verify Deployment</h3>
          <p>After deployment, check in your Shopify admin:</p>
          <ol>
            <li>Go to <strong>Settings → Checkout</strong></li>
            <li>Look for <strong>"DIY Label Local Pickup"</strong> in functions</li>
            <li>Make sure it's <strong>enabled</strong></li>
          </ol>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f3e5f5',
          border: '1px solid #9c27b0',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Step 3: Test the Pickup Option</h3>
          <p>After deployment:</p>
          <ol>
            <li>Make sure you have a product in your cart</li>
            <li>Ensure cart attributes are set (they already are! ✅)</li>
            <li>Go to checkout</li>
            <li>Look for: <strong>"🌱 Local Print Shop Pickup - FREE"</strong></li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Quick Test</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h4>Current Cart Status:</h4>
          <button
            onClick={() => {
              fetch('/cart.js')
                .then(r => r.json())
                .then(cart => {
                  const enabled = cart.attributes?.diy_label_enabled;
                  const printShop = cart.attributes?.diy_label_print_shop_name;
                  alert(`DIY Label Status:
✅ Enabled: ${enabled}
🏪 Print Shop: ${printShop}
📦 Items: ${cart.items.length}

${enabled === 'true' ? 'Ready for checkout! Deploy the function and test.' : 'Set cart attributes first.'}`);
                });
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Check Cart Status
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 Troubleshooting</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '8px'
        }}>
          <h4>If pickup option still doesn't appear after deployment:</h4>
          <ol>
            <li><strong>Check function status:</strong> Go to Shopify admin → Settings → Checkout</li>
            <li><strong>Verify cart has items:</strong> Function only works with products in cart</li>
            <li><strong>Clear browser cache:</strong> Hard refresh the checkout page</li>
            <li><strong>Check console errors:</strong> Look for any JavaScript errors</li>
            <li><strong>Test in incognito:</strong> Try checkout in a private browser window</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Expected Result</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px'
        }}>
          <h4>After successful deployment, you should see:</h4>
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            margin: '10px 0'
          }}>
            <strong>Shipping method</strong><br/>
            <div style={{ margin: '10px 0' }}>
              ○ Standard - $14.90<br/>
              ○ Express - $21.90<br/>
              <strong>● 🌱 Local Print Shop Pickup - FREE</strong>
            </div>
          </div>
          <p>The pickup option should appear as a <strong>FREE</strong> shipping method!</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/test-cart-attributes">Test Cart Attributes</a></li>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="/checkout">Go to Checkout</a></li>
          <li><a href="/app">Admin Dashboard</a></li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px', 
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px'
      }}>
        <h4>💡 Summary</h4>
        <p>
          Your cart attributes are working perfectly! The only missing piece is deploying 
          the Shopify Function. Run <code>shopify app deploy</code> and the pickup option 
          should appear in checkout.
        </p>
      </div>
    </div>
  );
}