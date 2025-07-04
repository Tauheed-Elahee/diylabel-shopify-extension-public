@@ .. @@
 export const action = async ({ request }: ActionFunctionArgs) => {
   if (request.method !== 'POST') {
     return json({ error: 'Method not allowed' }, { status: 405 });
   }
 
   try {
+    console.log('DIY Label order creation started');
+    
     const body = await request.json();
+    console.log('Request body:', body);
+    
     const {
       shopifyOrderId,
       shopDomain,
       printShopId,
       productData,
       customerData,
       options = {}
     } = body;
 
     // Validate required fields
     if (!shopifyOrderId || !shopDomain || !printShopId || !productData || !customerData) {
+      console.log('Validation failed:', { shopifyOrderId, shopDomain, printShopId, productData, customerData });
       return json({ 
         error: 'Missing required fields: shopifyOrderId, shopDomain, printShopId, productData, customerData' 
       }, { status: 400 });
     }
 
     // Get store
+    console.log('Looking up store:', shopDomain);
     const { data: store, error: storeError } = await supabaseAdmin
       .from('shopify_stores')
       .select('id')
       .eq('shop_domain', shopDomain)
       .single();
 
     if (storeError || !store) {
+      console.log('Store lookup failed:', storeError);
       return json({ error: 'Store not found' }, { status: 404 });
     }
+    console.log('Store found:', store.id);
 
     // Verify print shop exists and is active
+    console.log('Looking up print shop:', printShopId);
     const { data: printShop, error: printShopError } = await supabaseAdmin
       .from('print_shops')
       .select('id, name, active')
       .eq('id', printShopId)
       .eq('active', true)
       .single();
 
     if (printShopError || !printShop) {
+      console.log('Print shop lookup failed:', printShopError);
       return json({ error: 'Print shop not found or inactive' }, { status: 404 });
     }
+    console.log('Print shop found:', printShop.name);
 
     // Create DIY Label order
+    console.log('Creating DIY Label order...');
     const { data: order, error: orderError } = await supabaseAdmin
       .from('diy_label_orders')
       .insert({
         shopify_order_id: shopifyOrderId,
         shopify_store_id: store.id,
         print_shop_id: printShopId,
         product_data: productData,
         customer_data: customerData,
         status: 'pending',
         tracking_info: {
           created_at: new Date().toISOString(),
           options
         }
       })
       .select()
       .single();
 
     if (orderError) {
+      console.log('Order creation failed:', orderError);
       throw orderError;
     }
+    console.log('Order created successfully:', order.id);
 
     // TODO: Send notification to print shop
     // TODO: Send confirmation email to customer
     // TODO: Update Shopify order with DIY Label tracking info
 
     return json({
       success: true,
       order: {
         id: order.id,
         status: order.status,
         printShop: printShop.name,
         estimatedCompletion: calculateEstimatedCompletion()
       }
     });
 
   } catch (error) {
     console.error('Error creating DIY Label order:', error);
     return json({ 
       error: 'Failed to create DIY Label order',
       details: error instanceof Error ? error.message : 'Unknown error'
     }, { status: 500 });
   }
 };