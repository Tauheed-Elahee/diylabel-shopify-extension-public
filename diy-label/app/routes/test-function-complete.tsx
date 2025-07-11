import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    testSteps: [
      'Deploy function to Shopify',
      'Set cart attributes',
      'Add products to cart',
      'Test in checkout'
    ]
  });
};

export default function TestFunctionComplete() {
  const data = useLoaderData<typeof loader>();

  const runCompleteTest = async () => {
    console.log('🚀 Starting complete DIY Label function test...');
    
    try {
      // Step 1: Check if we can access cart
      console.log('📦 Step 1: Checking cart access...');
      const cartResponse = await fetch('/cart.js');
      
      if (!cartResponse.ok) {
        throw new Error('Cannot access cart - you must be on a Shopify store page');
      }
      
      const cart = await cartResponse.json();
      console.log('✅ Cart accessible:', cart);
      
      // Step 2: Set DIY Label attributes
      console.log('🏷️ Step 2: Setting DIY Label cart attributes...');
      const updateResponse = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            'diy_label_enabled': 'true',
            'diy_label_print_shop_id': '1',
            'diy_label_print_shop_name': 'Test Print Shop',
            'diy_label_print_shop_address': '123 Test Street, Test City'
          }
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update cart attributes');
      }
      
      const updatedCart = await updateResponse.json();
      console.log('✅ Cart attributes set:', updatedCart.attributes);
      
      // Step 3: Verify attributes
      console.log('🔍 Step 3: Verifying cart attributes...');
      const verifyResponse = await fetch('/cart.js');
      const verifiedCart = await verifyResponse.json();
      
      const diyEnabled = verifiedCart.attributes?.diy_label_enabled;
      const printShop = verifiedCart.attributes?.diy_label_print_shop_name;
      
      console.log('✅ Verification complete:', {
        diyEnabled,
        printShop,
        itemCount: verifiedCart.items.length
      });
      
      // Step 4: Show results
      const resultMessage = `🎉 Test Complete!

✅ Cart Access: Working
✅ Attributes Set: diy_label_enabled = ${diyEnabled}
✅ Print Shop: ${printShop}
📦 Items in Cart: ${verifiedCart.items.length}

${verifiedCart.items.length === 0 ? 
  '⚠️ WARNING: No items in cart! Add a product first.' : 
  '✅ Ready for checkout test!'
}

Next Steps:
1. ${verifiedCart.items.length === 0 ? 'Add a product to your cart' : 'Go to checkout'}
2. Look for "🌱 Local Print Shop Pickup - FREE"
3. If not visible, the function needs deployment

Function deployed? Run: shopify app deploy`;

      alert(resultMessage);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert(`❌ Test Failed: ${error.message}

This usually means:
1. You're not on a Shopify store page
2. Cart API is not accessible
3. You need to test from: https://diy-label.myshopify.com

Current location: ${window.location.href}`);
    }
  };

  const checkDeploymentStatus = () => {
    const instructions = `🚀 Check Function Deployment Status

Method 1: Partners Dashboard
1. Go to https://partners.shopify.com
2. Find your "diy-label" app
3. Look for "Extensions" section
4. Should see "DIY Label Local Pickup" function

Method 2: CLI Commands
Run in terminal:
- shopify app info
- shopify app list extensions
- shopify app deploy (if needed)

Method 3: Direct Test
1. Add product to cart
2. Set cart attributes (use button above)
3. Go to checkout
4. Look for pickup option

Expected Result:
"🌱 Local Print Shop Pickup - FREE" should appear as a shipping option.`;

    alert(instructions);
  };

  const goToCheckout = () => {
    // First set attributes, then redirect
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
    .then(() => {
      window.location.href = '/checkout';
    })
    .catch(error => {
      alert('Error setting attributes: ' + error.message);
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧪 Complete Function Test</h1>
      
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
        <h2 style={{ margin: '0 0 15px 0', color: '#856404' }}>⚠️ Important</h2>
        <p>This test must be run from your <strong>Shopify store</strong>, not the app tunnel.</p>
        <p><strong>Correct URL:</strong> <code>https://diy-label.myshopify.com/pages/test-function</code></p>
        <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚀 Test Actions</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #007cba',
            borderRadius: '8px'
          }}>
            <h3>1. Complete Function Test</h3>
            <p>Tests cart access, sets attributes, and verifies everything is ready for checkout.</p>
            <button
              onClick={runCompleteTest}
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
              Run Complete Test
            </button>
          </div>

          <div style={{ 
            padding: '20px', 
            border: '1px solid #28a745',
            borderRadius: '8px'
          }}>
            <h3>2. Check Deployment Status</h3>
            <p>Shows how to verify if the Shopify Function is deployed correctly.</p>
            <button
              onClick={checkDeploymentStatus}
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
              Check Deployment
            </button>
          </div>

          <div style={{ 
            padding: '20px', 
            border: '1px solid #ff9800',
            borderRadius: '8px'
          }}>
            <h3>3. Set Attributes & Go to Checkout</h3>
            <p>Sets DIY Label attributes and redirects to checkout for immediate testing.</p>
            <button
              onClick={goToCheckout}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Test in Checkout
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Expected Results</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px'
        }}>
          <h4>✅ If Function is Working:</h4>
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            margin: '15px 0',
            fontFamily: 'monospace'
          }}>
            <strong>Shipping Methods:</strong><br/>
            ○ Standard - $14.90<br/>
            ○ Express - $21.90<br/>
            <span style={{ color: '#4caf50', fontWeight: 'bold' }}>● 🌱 Local Print Shop Pickup - FREE</span>
          </div>
          <p>The pickup option should appear as a <strong>FREE</strong> shipping method!</p>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <h4>❌ If Function is NOT Working:</h4>
          <ul>
            <li>Only standard shipping methods appear</li>
            <li>No pickup option visible</li>
            <li>Function needs deployment: <code>shopify app deploy</code></li>
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
          <h4>Deploy the function:</h4>
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

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/cart">View Cart</a></li>
          <li><a href="/checkout">Go to Checkout</a></li>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="/app">Admin Dashboard</a></li>
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
        <h4>💡 Summary</h4>
        <p>
          The function has been updated and should be deployed. Run the complete test above 
          to verify everything is working, then test in checkout. If the pickup option 
          doesn't appear, run <code>shopify app deploy</code> to deploy the function.
        </p>
      </div>
    </div>
  );
}