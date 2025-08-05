import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    checklistItems: [
      'Extension deployment status',
      'Cart attributes configuration',
      'Shipping address requirements',
      'Extension targeting configuration',
      'Function deployment status'
    ]
  });
};

export default function DebugExtensionVisibility() {
  const data = useLoaderData<typeof loader>();

  const testCartAttributesForExtension = () => {
    // Set cart attributes that should trigger the extension
    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributes: {
          'diy_label_enabled': 'true',
          'diy_label_print_shop_id': '10',
          'diy_label_print_shop_name': 'Capital Print Co.',
          'diy_label_print_shop_address': '123 Bank St, Ottawa, ON'
        }
      })
    })
    .then(response => response.json())
    .then(cart => {
      console.log('Cart attributes set for extension test:', cart.attributes);
      alert(`✅ Cart attributes set for extension test!

DIY Label Enabled: ${cart.attributes?.diy_label_enabled}
Print Shop: ${cart.attributes?.diy_label_print_shop_name}

Now refresh the checkout page and look for the DIY Label extension.`);
    })
    .catch(error => {
      console.error('Error setting cart attributes:', error);
      alert('❌ Error setting cart attributes: ' + error.message);
    });
  };

  const checkCurrentCartState = () => {
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        console.log('Current cart state:', cart);
        
        const diyEnabled = cart.attributes?.diy_label_enabled;
        const printShop = cart.attributes?.diy_label_print_shop_name;
        const itemCount = cart.items.length;
        
        alert(`📋 Current Cart State:

Items in cart: ${itemCount}
DIY Label enabled: ${diyEnabled || 'false'}
Selected print shop: ${printShop || 'none'}

Extension should ${diyEnabled === 'true' ? 'show selected print shop' : 'show print shop selection'}`);
      })
      .catch(error => {
        alert('❌ Error checking cart: ' + error.message);
      });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '900px' }}>
      <h1>🔍 Extension Visibility Debug</h1>
      
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
        backgroundColor: '#fee8e8',
        border: '1px solid #f44336',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#d32f2f' }}>🚨 Extension Not Visible in Checkout</h2>
        <p>The DIY Label extension is not appearing in the checkout interface. This could be due to several reasons.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 Possible Reasons</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #f44336',
            borderRadius: '4px',
            backgroundColor: '#fff5f5'
          }}>
            <h3>1. Extension Not Deployed</h3>
            <p>The checkout UI extension hasn't been deployed to Shopify.</p>
            <p><strong>Solution:</strong> Run <code>shopify app deploy</code></p>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #ff9800',
            borderRadius: '4px',
            backgroundColor: '#fff8e1'
          }}>
            <h3>2. Extension Targeting Issues</h3>
            <p>The extension targets might not be configured correctly for the checkout flow.</p>
            <p><strong>Current targets:</strong></p>
            <ul>
              <li><code>purchase.checkout.shipping-option-list.render-after</code></li>
              <li><code>purchase.checkout.pickup-location-list.render-before</code></li>
              <li><code>purchase.checkout.block.render</code> (added)</li>
            </ul>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #2196f3',
            borderRadius: '4px',
            backgroundColor: '#e3f2fd'
          }}>
            <h3>3. Cart Conditions Not Met</h3>
            <p>The extension might have conditions that aren't being met.</p>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Cart must have items</li>
              <li>Shipping address must be entered</li>
              <li>Extension logic must pass validation</li>
            </ul>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #9c27b0',
            borderRadius: '4px',
            backgroundColor: '#f3e5f5'
          }}>
            <h3>4. JavaScript Errors</h3>
            <p>The extension might be failing due to JavaScript errors.</p>
            <p><strong>Check:</strong> Browser console for errors during checkout</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Test Actions</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #007cba',
            borderRadius: '8px'
          }}>
            <h3>1. Set Cart Attributes for Extension</h3>
            <p>This will set the cart attributes that the extension looks for.</p>
            <button
              onClick={testCartAttributesForExtension}
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
              Set Extension Test Attributes
            </button>
          </div>

          <div style={{ 
            padding: '20px', 
            border: '1px solid '#28a745',
            borderRadius: '8px'
          }}>
            <h3>2. Check Current Cart State</h3>
            <p>View what's currently in the cart and what attributes are set.</p>
            <button
              onClick={checkCurrentCartState}
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
              Check Cart State
            </button>
          </div>
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
          <h4>Deploy the checkout extension:</h4>
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
          
          <h4>Check deployment status:</h4>
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
        <h2>📋 Debugging Checklist</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h4>Step-by-step debugging:</h4>
          <ol>
            <li><strong>✅ Add product to cart</strong> (visible in screenshot)</li>
            <li><strong>✅ Enter shipping address</strong> (visible in screenshot)</li>
            <li><strong>🔄 Deploy extension:</strong> Run <code>shopify app deploy</code></li>
            <li><strong>🔄 Set cart attributes:</strong> Use button above</li>
            <li><strong>🔄 Refresh checkout:</strong> Hard refresh (Ctrl+F5)</li>
            <li><strong>🔄 Check console:</strong> Look for extension logs</li>
            <li><strong>🔄 Verify targeting:</strong> Extension should appear in multiple locations</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🎯 Expected Behavior</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px'
        }}>
          <h4>After deployment and cart attribute setup, you should see:</h4>
          <ol>
            <li><strong>Banner:</strong> "🌱 Local Printing Available" message</li>
            <li><strong>Print shop selector:</strong> Dropdown with nearby print shops</li>
            <li><strong>Shop details:</strong> Selected print shop information</li>
            <li><strong>Multiple locations:</strong> Extension appears in 3 different checkout areas</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚨 Most Likely Issue</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '8px'
        }}>
          <h4>Extension Not Deployed</h4>
          <p>Based on the console logs showing the extension is trying to load but not visible in checkout, the most likely issue is that the extension hasn't been deployed to Shopify.</p>
          
          <p><strong>Immediate fix:</strong></p>
          <ol>
            <li>Run <code>shopify app deploy</code> in your terminal</li>
            <li>Wait for deployment to complete</li>
            <li>Set cart attributes using the button above</li>
            <li>Refresh the checkout page</li>
            <li>Look for the DIY Label extension</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/test-cart-attributes">Test Cart Attributes</a></li>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="/debug-function-deployment">Function Deployment</a></li>
          <li><a href="/checkout">Go to Checkout</a></li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '4px'
      }}>
        <h4>💡 Key Insight</h4>
        <p>
          The console logs show the extension is loading and trying to geocode addresses, 
          but it's not visible in the checkout UI. This strongly suggests the extension 
          needs to be deployed with <code>shopify app deploy</code>.
        </p>
      </div>
    </div>
  );
}