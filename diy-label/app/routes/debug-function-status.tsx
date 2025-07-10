import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    deploymentMethods: [
      'Check Partners Dashboard',
      'Test function directly in checkout',
      'Verify with CLI commands',
      'Check deployment logs'
    ]
  });
};

export default function DebugFunctionStatus() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '900px' }}>
      <h1>🔍 Function Deployment Status</h1>
      
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
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#856404' }}>📝 Important Note</h2>
        <p>Functions are only visible in <strong>Shopify Plus</strong> stores or in the <strong>Partners Dashboard</strong>. Regular Shopify stores don't show the functions section in checkout settings.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>✅ How to Verify Function Deployment</h2>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Method 1: Partners Dashboard</h3>
            <ol>
              <li>Go to <a href="https://partners.shopify.com" target="_blank" style={{ color: '#007cba' }}>Shopify Partners Dashboard</a></li>
              <li>Find your "diy-label" app</li>
              <li>Click on the app name</li>
              <li>Look for <strong>"Extensions"</strong> section</li>
              <li>You should see <strong>"DIY Label Local Pickup"</strong> function listed</li>
              <li>Status should show as <strong>"Active"</strong> or <strong>"Published"</strong></li>
            </ol>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Method 2: CLI Verification</h3>
            <p>Run these commands in your terminal:</p>
            <div style={{ 
              backgroundColor: '#2d3748', 
              color: '#e2e8f0', 
              padding: '15px', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              margin: '10px 0'
            }}>
              # Check deployment status<br/>
              shopify app info<br/><br/>
              # List all extensions<br/>
              shopify app list extensions<br/><br/>
              # Deploy if needed<br/>
              shopify app deploy
            </div>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f3e5f5',
            border: '1px solid #9c27b0',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Method 3: Direct Checkout Test</h3>
            <p>The most reliable way to test:</p>
            <ol>
              <li>Add a product to your cart</li>
              <li>Set DIY Label cart attributes (use button below)</li>
              <li>Go to checkout</li>
              <li>Look for pickup option in shipping methods</li>
            </ol>
            
            <button
              onClick={() => {
                // Set cart attributes for testing
                fetch('/cart/update.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    attributes: {
                      'diy_label_enabled': 'true',
                      'diy_label_print_shop_id': '1',
                      'diy_label_print_shop_name': 'Test Print Shop',
                      'diy_label_print_shop_address': '123 Test Street'
                    }
                  })
                })
                .then(response => response.json())
                .then(() => {
                  alert('✅ Cart attributes set! Now go to checkout and look for:\n\n"🌱 Local Print Shop Pickup - FREE"\n\nIf you see this option, the function is working!');
                })
                .catch(error => {
                  alert('❌ Error setting cart attributes: ' + error.message);
                });
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#9c27b0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '15px'
              }}
            >
              Set Test Attributes & Go to Checkout
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🎯 What to Look For</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px'
        }}>
          <h4>✅ Function is Working if you see:</h4>
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            margin: '15px 0',
            fontFamily: 'monospace'
          }}>
            <strong>Shipping method</strong><br/>
            <div style={{ margin: '10px 0' }}>
              ○ Standard - $14.90<br/>
              ○ Express - $21.90<br/>
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>● 🌱 Local Print Shop Pickup - FREE</span>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <h4>❌ Function is NOT Working if:</h4>
          <ul>
            <li>No pickup option appears in checkout</li>
            <li>Only standard shipping methods show</li>
            <li>Console shows function errors</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Deployment Commands</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <h4>If function is not deployed, run:</h4>
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
          
          <h4>To check deployment status:</h4>
          <div style={{ 
            backgroundColor: '#2d3748', 
            color: '#e2e8f0', 
            padding: '15px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            margin: '10px 0'
          }}>
            shopify app info<br/>
            shopify app list extensions
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚨 Common Issues</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h4>If pickup option doesn't appear:</h4>
          <ol>
            <li><strong>Function not deployed:</strong> Run <code>shopify app deploy</code></li>
            <li><strong>No cart items:</strong> Add products to cart first</li>
            <li><strong>Cart attributes not set:</strong> Use test button above</li>
            <li><strong>Browser cache:</strong> Hard refresh checkout page (Ctrl+F5)</li>
            <li><strong>Development store:</strong> Make sure you're testing on the right store</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/test-cart-attributes">Test Cart Attributes</a></li>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="/cart">View Cart</a></li>
          <li><a href="/checkout">Go to Checkout</a></li>
          <li><a href="https://partners.shopify.com" target="_blank">Partners Dashboard</a></li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '4px'
      }}>
        <h4>💡 Pro Tip</h4>
        <p>
          The easiest way to verify the function is working is to test it directly in checkout. 
          Use the "Set Test Attributes" button above, then go to checkout. If you see the 
          pickup option, your function is deployed and working correctly!
        </p>
      </div>
    </div>
  );
}