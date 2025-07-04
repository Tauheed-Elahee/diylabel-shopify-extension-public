import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    success: false
  };

  try {
    // Step 1: Test Shopify authentication
    debugInfo.steps.push("1. Testing Shopify authentication...");
    const { admin, session } = await authenticate.admin(request);
    debugInfo.steps.push(`✅ Shopify auth successful - Shop: ${session.shop}`);

    // Step 2: Test database connection
    debugInfo.steps.push("2. Testing database connection...");
    const { data: testQuery, error: dbError } = await supabaseAdmin
      .from('shopify_stores')
      .select('count')
      .limit(1);
    
    if (dbError) {
      debugInfo.errors.push(`Database error: ${dbError.message}`);
    } else {
      debugInfo.steps.push("✅ Database connection successful");
    }

    // Step 3: Test store lookup/creation
    debugInfo.steps.push("3. Testing store lookup...");
    const { data: existingStore, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', session.shop)
      .single();

    if (storeError && storeError.code === 'PGRST116') {
      debugInfo.steps.push("Store not found, attempting to create...");
      
      const { data: newStore, error: createError } = await supabaseAdmin
        .from('shopify_stores')
        .insert({
          shop_domain: session.shop,
          access_token: session.accessToken,
          scope: session.scope,
          settings: {}
        })
        .select()
        .single();

      if (createError) {
        debugInfo.errors.push(`Store creation error: ${createError.message}`);
      } else {
        debugInfo.steps.push("✅ Store created successfully");
      }
    } else if (storeError) {
      debugInfo.errors.push(`Store lookup error: ${storeError.message}`);
    } else {
      debugInfo.steps.push("✅ Store found in database");
    }

    // Step 4: Test Shopify GraphQL API
    debugInfo.steps.push("4. Testing Shopify GraphQL API...");
    try {
      const productsResponse = await admin.graphql(`
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                status
              }
            }
          }
        }
      `, {
        variables: { first: 5 }
      });

      const productsData = await productsResponse.json();
      
      if (productsData.errors) {
        debugInfo.errors.push(`GraphQL errors: ${JSON.stringify(productsData.errors)}`);
      } else {
        const productCount = productsData.data?.products?.edges?.length || 0;
        debugInfo.steps.push(`✅ GraphQL API successful - Found ${productCount} products`);
      }
    } catch (graphqlError) {
      debugInfo.errors.push(`GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : 'Unknown GraphQL error'}`);
    }

    // Step 5: Test product settings query
    debugInfo.steps.push("5. Testing product settings query...");
    const { data: productSettings, error: settingsError } = await supabaseAdmin
      .from('product_settings')
      .select('count')
      .limit(1);
    
    if (settingsError) {
      debugInfo.errors.push(`Product settings error: ${settingsError.message}`);
    } else {
      debugInfo.steps.push("✅ Product settings query successful");
    }

    // Step 6: Test orders query
    debugInfo.steps.push("6. Testing orders query...");
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('diy_label_orders')
      .select('count')
      .limit(1);
    
    if (ordersError) {
      debugInfo.errors.push(`Orders query error: ${ordersError.message}`);
    } else {
      debugInfo.steps.push("✅ Orders query successful");
    }

    // Step 7: Test print shops query
    debugInfo.steps.push("7. Testing print shops query...");
    const { count: printShopsCount, error: printShopsError } = await supabaseAdmin
      .from('print_shops')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    if (printShopsError) {
      debugInfo.errors.push(`Print shops query error: ${printShopsError.message}`);
    } else {
      debugInfo.steps.push(`✅ Print shops query successful - Found ${printShopsCount} active shops`);
    }

    debugInfo.success = debugInfo.errors.length === 0;

    return json({
      debugInfo,
      session: {
        shop: session.shop,
        scope: session.scope,
        isOnline: session.isOnline
      }
    });

  } catch (error) {
    debugInfo.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    debugInfo.success = false;

    return json({
      debugInfo,
      criticalError: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown critical error'
    });
  }
};

export default function DebugDashboard() {
  const { debugInfo, session, criticalError } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>Dashboard Debug Information</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Overall Status</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: debugInfo.success ? '#e8f5e8' : '#fee8e8',
          border: `1px solid ${debugInfo.success ? '#4caf50' : '#f44336'}`,
          borderRadius: '4px'
        }}>
          <p><strong>Status:</strong> {debugInfo.success ? '✅ All checks passed' : '❌ Issues detected'}</p>
          <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
          {session && (
            <>
              <p><strong>Shop:</strong> {session.shop}</p>
              <p><strong>Scope:</strong> {session.scope}</p>
              <p><strong>Online:</strong> {session.isOnline ? 'Yes' : 'No'}</p>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Step-by-Step Results</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          {debugInfo.steps.map((step, index) => (
            <p key={index} style={{ margin: '5px 0', fontFamily: 'monospace' }}>
              {step}
            </p>
          ))}
        </div>
      </div>

      {debugInfo.errors.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Errors Detected</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee8e8',
            border: '1px solid #f44336',
            borderRadius: '4px'
          }}>
            {debugInfo.errors.map((error, index) => (
              <p key={index} style={{ margin: '5px 0', color: '#d32f2f' }}>
                ❌ {error}
              </p>
            ))}
          </div>
        </div>
      )}

      {criticalError && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Critical Error Details</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee8e8',
            border: '1px solid #f44336',
            borderRadius: '4px'
          }}>
            <p><strong>Message:</strong> {criticalError.message}</p>
            <p><strong>Name:</strong> {criticalError.name}</p>
            {criticalError.stack && (
              <details>
                <summary>Stack Trace</summary>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {criticalError.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Quick Actions</h3>
        <ul>
          <li><a href="/app">Try Dashboard Again</a></li>
          <li><a href="/debug-shopify-auth">Check Shopify Auth</a></li>
          <li><a href="/diagnose-db">Check Database</a></li>
        </ul>
      </div>
    </div>
  );
}