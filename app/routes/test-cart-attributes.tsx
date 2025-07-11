@@ .. @@
   return (
     <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
       <h1>🧪 Cart Attributes Test Page</h1>
       
+      <div style={{ 
+        padding: '15px', 
+        backgroundColor: '#fee8e8',
+        border: '1px solid #f44336',
+        borderRadius: '4px',
+        marginBottom: '20px'
+      }}>
+        <h3>⚠️ Important: Test Location</h3>
+        <p>This test page must be accessed from within your <strong>Shopify store</strong>, not the app tunnel.</p>
+        <p><strong>Correct URL:</strong> <code>https://diy-label.myshopify.com/pages/test-cart-attributes</code></p>
+        <p><strong>Current URL:</strong> App tunnel (cart API not available)</p>
+      </div>
+
       <div style={{ marginBottom: '30px' }}>
         <p>This page helps you test the cart attribute functionality that the DIY Label function depends on.</p>
         <p><strong>Open your browser console (F12)</strong> to see detailed logs.</p>
       </div>
@@ .. @@
       <div style={{ marginBottom: '30px' }}>
         <h2>🚀 Testing Workflow</h2>
         
+        <div style={{ 
+          padding: '15px', 
+          backgroundColor: '#fff3cd',
+          border: '1px solid #ffeaa7',
+          borderRadius: '4px',
+          marginBottom: '15px'
+        }}>
+          <h4>🎯 Correct Testing Method:</h4>
+          <ol>
+            <li><strong>Go to your Shopify store:</strong> <a href="https://diy-label.myshopify.com" target="_blank">diy-label.myshopify.com</a></li>
+            <li><strong>Add any product to cart</strong></li>
+            <li><strong>Use the DIY Label widget</strong> on a product page to select a print shop</li>
+            <li><strong>Go to checkout</strong> and look for the pickup option</li>
+          </ol>
+        </div>
+
         <div style={{ 
           padding: '15px', 
           backgroundColor: '#e3f2fd',