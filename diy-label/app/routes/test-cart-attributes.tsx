import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    timestamp: new Date().toISOString(),
    instructions: [
      'This page helps you test cart attributes in your browser',
      'Open browser console (F12) to see detailed logs',
      'Use the buttons below to test different scenarios'
    ]
  });
};

export default function TestCartAttributes() {
  const data = useLoaderData<typeof loader>();

  const testCartUpdate = () => {
    console.log('🧪 Testing cart attribute update...');
    
    fetch('/cart/update.js', {
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
    })
    .then(response => {
      console.log('📡 Cart update response status:', response.status);
      return response.json();
    })
    .then(cart => {
      console.log('✅ Cart update successful:', cart);
      console.log('📋 Cart attributes:', cart.attributes);
      alert('✅ Cart updated successfully! Check console for details.');
    })
    .catch(error => {
      console.error('❌ Cart update failed:', error);
      alert('❌ Cart update failed: ' + error.message);
    });
  };

  const checkCurrentCart = () => {
    console.log('🔍 Checking current cart...');
    
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        console.log('📦 Current cart:', cart);
        console.log('📋 Cart attributes:', cart.attributes);
        console.log('🛒 Cart items:', cart.items);
        
        const diyEnabled = cart.attributes?.diy_label_enabled;
        const printShop = cart.attributes?.diy_label_print_shop_name;
        
        alert(`📋 Cart Status:
DIY Label Enabled: ${diyEnabled || 'false'}
Print Shop: ${printShop || 'none'}
Items in cart: ${cart.items.length}

Check console for full details.`);
      })
      .catch(error => {
        console.error('❌ Error checking cart:', error);
        alert('❌ Error checking cart: ' + error.message);
      });
  };

  const clearCartAttributes = () => {
    console.log('🧹 Clearing DIY Label cart attributes...');
    
    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributes: {
          'diy_label_enabled': '',
          'diy_label_print_shop_id': '',
          'diy_label_print_shop_name': '',
          'diy_label_print_shop_address': ''
        }
      })
    })
    .then(response => response.json())
    .then(cart => {
      console.log('🧹 Cart attributes cleared:', cart.attributes);
      alert('🧹 DIY Label attributes cleared from cart!');
    })
    .catch(error => {
      console.error('❌ Error clearing cart:', error);
      alert('❌ Error clearing cart: ' + error.message);
    });
  };

  const addTestProduct = () => {
    console.log('🛒 Adding test product to cart...');
    
    // This is a generic test - replace with actual product ID
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-variant-id', // This needs to be a real variant ID
        quantity: 1
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log('🛒 Product added to cart:', result);
      alert('🛒 Test product added to cart!');
    })
    .catch(error => {
      console.error('❌ Error adding product:', error);
      alert('❌ Error adding product. Use a real product from your store instead.');
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧪 Cart Attributes Test Page</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <p>This page helps you test the cart attribute functionality that the DIY Label function depends on.</p>
        <p><strong>Open your browser console (F12)</strong> to see detailed logs.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Test Actions</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #007cba',
            borderRadius: '4px'
          }}>
            <h3>1. Set DIY Label Attributes</h3>
            <p>This simulates selecting a print shop and sets the required cart attributes.</p>
            <button
              onClick={testCartUpdate}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Set DIY Label Attributes
            </button>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #28a745',
            borderRadius: '4px'
          }}>
            <h3>2. Check Current Cart</h3>
            <p>View what's currently stored in your cart attributes.</p>
            <button
              onClick={checkCurrentCart}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Check Cart Attributes
            </button>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #ff9800',
            borderRadius: '4px'
          }}>
            <h3>3. Clear DIY Label Attributes</h3>
            <p>Remove all DIY Label attributes from the cart.</p>
            <button
              onClick={clearCartAttributes}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Clear Attributes
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Expected Behavior</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h4>After setting DIY Label attributes:</h4>
          <ol>
            <li>Cart should have <code>diy_label_enabled: "true"</code></li>
            <li>Cart should have print shop details</li>
            <li>Go to checkout and look for "🌱 Local Print Shop Pickup" option</li>
            <li>The pickup option should be <strong>FREE</strong></li>
          </ol>
          
          <h4>If pickup option doesn't appear:</h4>
          <ul>
            <li>Check that the function is deployed: <code>shopify app deploy</code></li>
            <li>Verify cart attributes are set correctly</li>
            <li>Make sure you have products in your cart</li>
            <li>Check browser console for errors</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚀 Testing Workflow</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px'
        }}>
          <h4>Complete Test Process:</h4>
          <ol>
            <li><strong>Add a product to cart</strong> (any product from your store)</li>
            <li><strong>Click "Set DIY Label Attributes"</strong> above</li>
            <li><strong>Click "Check Cart Attributes"</strong> to verify</li>
            <li><strong>Go to checkout</strong> (/checkout)</li>
            <li><strong>Look for the pickup option</strong> in shipping methods</li>
            <li><strong>Should see:</strong> "🌱 Local Print Shop Pickup - FREE"</li>
          </ol>
        </div>
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
          <li><a href="/cart">View Cart</a></li>
          <li><a href="/checkout">Go to Checkout</a></li>
          <li><a href="/debug-diy-label-flow">Debug Flow</a></li>
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
        <h4>💡 Pro Tip</h4>
        <p>
          If you're testing on a development store, make sure you have at least one product 
          in your cart before testing the checkout function. The function only generates 
          pickup options when there are items to fulfill.
        </p>
      </div>
    </div>
  );
}