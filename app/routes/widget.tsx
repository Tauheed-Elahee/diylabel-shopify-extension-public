@@ .. @@
               // Select a print shop
               window.selectPrintShop = function(index) {
                 const shop = printShops[index];
                 updateStatus('Selected: ' + shop.name);
                 
+                // Create actual order instead of just showing alert
+                createDIYLabelOrder(shop);
+              };
+              
+              // Function to create DIY Label order
+              async function createDIYLabelOrder(printShop) {
+                try {
+                  updateStatus('Creating order with ' + printShop.name + '...', true);
+                  
+                  // Get product ID from URL or widget data
+                  const urlParams = new URLSearchParams(window.location.search);
+                  const productId = urlParams.get('product');
+                  const shopDomain = urlParams.get('shop');
+                  
+                  if (!productId || !shopDomain) {
+                    throw new Error('Missing product ID or shop domain');
+                  }
+                  
+                  // Create order data
+                  const orderData = {
+                    shopifyOrderId: 'widget-order-' + Date.now(),
+                    shopDomain: shopDomain,
+                    printShopId: printShop.id,
+                    productData: {
+                      title: 'Product from Widget',
+                      product_id: productId,
+                      total: 25.00 // This would come from the actual product
+                    },
+                    customerData: {
+                      name: 'Widget Customer',
+                      email: 'customer@example.com'
+                      // In a real implementation, this would come from the checkout
+                    },
+                    options: {
+                      source: 'widget',
+                      user_location: userLocation
+                    }
+                  };
+                  
+                  // Send order to API
+                  const response = await fetch('/api/orders/diy-label', {
+                    method: 'POST',
+                    headers: {
+                      'Content-Type': 'application/json'
+                    },
+                    body: JSON.stringify(orderData)
+                  });
+                  
+                  const result = await response.json();
+                  
+                  if (response.ok && result.success) {
+                    updateStatus('Order created successfully!');
+                    
+                    // Show success message
+                    const successMessage = 'Order created with ' + printShop.name + '!\\n\\n' +
+                      'Order ID: ' + result.order.id + '\\n' +
+                      'Status: ' + result.order.status + '\\n' +
+                      'Estimated completion: ' + result.order.estimatedCompletion;
+                    
+                    alert(successMessage);
+                  } else {
+                    throw new Error(result.error || 'Failed to create order');
+                  }
+                  
+                } catch (error) {
+                  console.error('Error creating order:', error);
+                  updateStatus('Failed to create order');
+                  alert('Error creating order: ' + error.message + '\\n\\nThis is a demo - in a real store, this would integrate with your checkout process.');
+                }
+              }
+              
+              // Legacy function for demo purposes
+              window.selectPrintShopDemo = function(index) {
+                const shop = printShops[index];
+                updateStatus('Selected: ' + shop.name);
+                
                 // Send message to parent window
                 if (window.parent !== window) {
                   window.parent.postMessage({
                     type: 'diy-label-selection',
                     printShop: shop
                   }, '*');
                 }
                 
                 alert('Print shop selected: ' + shop.name + '\\n\\nThis would normally integrate with your checkout process to route the order to this local print shop.');
               };