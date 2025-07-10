import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop') || 'diy-label.myshopify.com';

  const results = {
    timestamp: new Date().toISOString(),
    shopDomain,
    tests: {}
  };

  // Test 1: Direct Shopify Authentication
  try {
    const { authenticate } = await import("../shopify.server");
    const { admin, session } = await authenticate.admin(request);
    
    results.tests.shopifyAuth = {
      success: true,
      session: {
        shop: session.shop,
        scope: session.scope,
        isOnline: session.isOnline,
        accessToken: session.accessToken ? {
          prefix: session.accessToken.substring(0, 10),
          length: session.accessToken.length,
          format: session.accessToken.startsWith('shpat_') ? 'Private App' :
                  session.accessToken.startsWith('shpca_') ? 'Custom App' :
                  session.accessToken.startsWith('shpss_') ? 'Session' : 'Unknown'
        } : null
      }
    };

    // Test GraphQL with session token
    try {
      const graphqlResponse = await admin.graphql(`
        query {
          shop {
            name
            id
            myshopifyDomain
          }
        }
      `);
      
      const graphqlData = await graphqlResponse.json();
      results.tests.shopifyAuth.graphql = {
        success: !graphqlData.errors,
        data: graphqlData.data?.shop,
        errors: graphqlData.errors
      };
    } catch (gqlError) {
      results.tests.shopifyAuth.graphql = {
        success: false,
        error: gqlError instanceof Error ? gqlError.message : 'GraphQL error'
      };
    }

  } catch (authError) {
    results.tests.shopifyAuth = {
      success: false,
      error: authError instanceof Error ? authError.message : 'Auth error',
      errorType: authError instanceof Error ? authError.name : 'Unknown'
    };
  }

  // Test 2: Database Store Lookup
  try {
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    results.tests.databaseStore = {
      success: !storeError,
      store: store ? {
        id: store.id,
        shop_domain: store.shop_domain,
        access_token: {
          exists: !!store.access_token,
          prefix: store.access_token ? store.access_token.substring(0, 10) : 'None',
          length: store.access_token?.length || 0,
          format: store.access_token ? (
            store.access_token.startsWith('shpat_') ? 'Private App' :
            store.access_token.startsWith('shpca_') ? 'Custom App' :
            store.access_token.startsWith('shpss_') ? 'Session' : 'Invalid'
          ) : 'None'
        },
        scope: store.scope,
        active: store.active,
        created_at: store.created_at,
        updated_at: store.updated_at
      } : null,
      error: storeError?.message
    };

    // Test 3: Direct API call with database token
    if (store?.access_token) {
      try {
        const apiResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        });

        const apiData = apiResponse.ok ? await apiResponse.json() : null;
        
        results.tests.databaseStore.apiTest = {
          success: apiResponse.ok,
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          shopName: apiData?.shop?.name,
          error: !apiResponse.ok ? `HTTP ${apiResponse.status}` : null
        };
      } catch (apiError) {
        results.tests.databaseStore.apiTest = {
          success: false,
          error: apiError instanceof Error ? apiError.message : 'API error'
        };
      }
    }

  } catch (dbError) {
    results.tests.databaseStore = {
      success: false,
      error: dbError instanceof Error ? dbError.message : 'Database error'
    };
  }

  // Test 4: Session Storage Check
  try {
    const { sessionStorage } = await import("../shopify.server");
    const sessionId = `offline_${shopDomain}`;
    const storedSession = await sessionStorage.loadSession(sessionId);
    
    results.tests.sessionStorage = {
      success: !!storedSession,
      sessionId,
      session: storedSession ? {
        shop: storedSession.shop,
        scope: storedSession.scope,
        isOnline: storedSession.isOnline,
        accessToken: storedSession.accessToken ? {
          prefix: storedSession.accessToken.substring(0, 10),
          length: storedSession.accessToken.length
        } : null
      } : null
    };
  } catch (sessionError) {
    results.tests.sessionStorage = {
      success: false,
      error: sessionError instanceof Error ? sessionError.message : 'Session storage error'
    };
  }

  // Test 5: Environment Variables
  results.tests.environment = {
    shopifyApiKey: !!process.env.SHOPIFY_API_KEY,
    shopifyApiSecret: !!process.env.SHOPIFY_API_SECRET,
    shopifyScopes: process.env.SHOPIFY_SCOPES,
    appUrl: process.env.SHOPIFY_APP_URL,
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  // Generate analysis
  results.analysis = analyzeResults(results.tests);

  return json(results);
};

function analyzeResults(tests: any) {
  const analysis = {
    summary: '',
    issues: [],
    recommendations: []
  };

  const shopifyAuthWorking = tests.shopifyAuth?.success;
  const databaseStoreExists = tests.databaseStore?.success && tests.databaseStore?.store;
  const databaseApiWorking = tests.databaseStore?.apiTest?.success;
  const sessionStorageWorking = tests.sessionStorage?.success;

  // Determine the main issue
  if (!shopifyAuthWorking && databaseStoreExists && databaseApiWorking) {
    analysis.summary = '🔄 Session Context Issue';
    analysis.issues.push('Shopify authentication fails in request context');
    analysis.issues.push('Database tokens are valid and working');
    analysis.issues.push('This suggests a session/context mismatch');
    
    analysis.recommendations.push('🔧 **SOLUTION: Clear Session Storage**');
    analysis.recommendations.push('1. Stop the dev server (Ctrl+C)');
    analysis.recommendations.push('2. Clear browser data completely');
    analysis.recommendations.push('3. Delete any local session files');
    analysis.recommendations.push('4. Restart: `shopify app dev`');
    analysis.recommendations.push('5. Fresh install with new tunnel URL');
  } else if (!shopifyAuthWorking && !databaseApiWorking) {
    analysis.summary = '🚨 Token Corruption';
    analysis.issues.push('Both session and database tokens are invalid');
    analysis.issues.push('Complete authentication failure');
    
    analysis.recommendations.push('🔄 **SOLUTION: Complete Reinstall**');
    analysis.recommendations.push('1. Uninstall app from Shopify admin');
    analysis.recommendations.push('2. Clear all browser data');
    analysis.recommendations.push('3. Restart dev server');
    analysis.recommendations.push('4. Fresh OAuth installation');
  } else if (shopifyAuthWorking && !databaseStoreExists) {
    analysis.summary = '📝 Database Sync Issue';
    analysis.issues.push('Shopify auth works but store not in database');
    analysis.issues.push('OAuth completed but store creation failed');
    
    analysis.recommendations.push('🔧 **SOLUTION: Trigger Store Creation**');
    analysis.recommendations.push('1. Visit /app to trigger store creation');
    analysis.recommendations.push('2. Check server logs for database errors');
    analysis.recommendations.push('3. Verify Supabase connection');
  } else if (shopifyAuthWorking && databaseStoreExists && databaseApiWorking) {
    analysis.summary = '✅ Everything Working';
    analysis.issues.push('All authentication systems are functional');
    
    analysis.recommendations.push('🎉 **All systems working correctly!**');
    analysis.recommendations.push('• Try accessing the dashboard again');
    analysis.recommendations.push('• The issue may have been temporary');
  } else {
    analysis.summary = '❓ Mixed Results';
    analysis.issues.push('Inconsistent authentication state detected');
    
    analysis.recommendations.push('🔍 **SOLUTION: Detailed Investigation**');
    analysis.recommendations.push('1. Check server logs for specific errors');
    analysis.recommendations.push('2. Try fresh browser session (incognito)');
    analysis.recommendations.push('3. Verify environment variables');
  }

  return analysis;
}

export default function DebugAuthComparison() {
  const data = useLoaderData<typeof loader>();

  const getStatusColor = (success: boolean) => success ? '#4caf50' : '#f44336';
  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>🔍 Authentication Discrepancy Analysis</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Analysis Summary</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h3>{data.analysis.summary}</h3>
          {data.analysis.issues.map((issue, index) => (
            <p key={index} style={{ margin: '5px 0' }}>• {issue}</p>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Test Results</h2>
        
        {/* Shopify Authentication Test */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{getStatusIcon(data.tests.shopifyAuth?.success)} Shopify Authentication</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.tests.shopifyAuth?.success ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${getStatusColor(data.tests.shopifyAuth?.success)}`,
            borderRadius: '4px'
          }}>
            {data.tests.shopifyAuth?.success ? (
              <>
                <p><strong>Shop:</strong> {data.tests.shopifyAuth.session.shop}</p>
                <p><strong>Scope:</strong> {data.tests.shopifyAuth.session.scope}</p>
                <p><strong>Online:</strong> {data.tests.shopifyAuth.session.isOnline ? 'Yes' : 'No'}</p>
                <p><strong>Token:</strong> {data.tests.shopifyAuth.session.accessToken?.prefix}... ({data.tests.shopifyAuth.session.accessToken?.format})</p>
                {data.tests.shopifyAuth.graphql && (
                  <p><strong>GraphQL:</strong> {data.tests.shopifyAuth.graphql.success ? '✅ Working' : '❌ Failed'}</p>
                )}
              </>
            ) : (
              <>
                <p><strong>Error:</strong> {data.tests.shopifyAuth?.error}</p>
                <p><strong>Type:</strong> {data.tests.shopifyAuth?.errorType}</p>
              </>
            )}
          </div>
        </div>

        {/* Database Store Test */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{getStatusIcon(data.tests.databaseStore?.success)} Database Store</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.tests.databaseStore?.success ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${getStatusColor(data.tests.databaseStore?.success)}`,
            borderRadius: '4px'
          }}>
            {data.tests.databaseStore?.success && data.tests.databaseStore?.store ? (
              <>
                <p><strong>Shop:</strong> {data.tests.databaseStore.store.shop_domain}</p>
                <p><strong>Token Format:</strong> {data.tests.databaseStore.store.access_token.format}</p>
                <p><strong>Token:</strong> {data.tests.databaseStore.store.access_token.prefix}... ({data.tests.databaseStore.store.access_token.length} chars)</p>
                <p><strong>Scope:</strong> {data.tests.databaseStore.store.scope}</p>
                <p><strong>Active:</strong> {data.tests.databaseStore.store.active ? 'Yes' : 'No'}</p>
                {data.tests.databaseStore.apiTest && (
                  <p><strong>API Test:</strong> {data.tests.databaseStore.apiTest.success ? 
                    `✅ ${data.tests.databaseStore.apiTest.shopName}` : 
                    `❌ ${data.tests.databaseStore.apiTest.error}`
                  }</p>
                )}
              </>
            ) : (
              <p><strong>Error:</strong> {data.tests.databaseStore?.error || 'Store not found'}</p>
            )}
          </div>
        </div>

        {/* Session Storage Test */}
        <div style={{ marginBottom: '20px' }}>
          <h3>{getStatusIcon(data.tests.sessionStorage?.success)} Session Storage</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.tests.sessionStorage?.success ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${getStatusColor(data.tests.sessionStorage?.success)}`,
            borderRadius: '4px'
          }}>
            {data.tests.sessionStorage?.success ? (
              <>
                <p><strong>Session ID:</strong> {data.tests.sessionStorage.sessionId}</p>
                <p><strong>Shop:</strong> {data.tests.sessionStorage.session?.shop}</p>
                <p><strong>Token:</strong> {data.tests.sessionStorage.session?.accessToken?.prefix}...</p>
              </>
            ) : (
              <p><strong>Error:</strong> {data.tests.sessionStorage?.error || 'No session found'}</p>
            )}
          </div>
        </div>

        {/* Environment Variables */}
        <div style={{ marginBottom: '20px' }}>
          <h3>⚙️ Environment Variables</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <p><strong>Shopify API Key:</strong> {data.tests.environment.shopifyApiKey ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Shopify API Secret:</strong> {data.tests.environment.shopifyApiSecret ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Shopify Scopes:</strong> {data.tests.environment.shopifyScopes || '❌ Not set'}</p>
            <p><strong>App URL:</strong> {data.tests.environment.appUrl || '❌ Not set'}</p>
            <p><strong>Supabase URL:</strong> {data.tests.environment.supabaseUrl ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Supabase Service Key:</strong> {data.tests.environment.supabaseServiceKey ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🛠️ Recommended Actions</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px'
        }}>
          {data.analysis.recommendations.map((rec, index) => (
            <p key={index} style={{ margin: '5px 0' }}>{rec}</p>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/app" style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007cba', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Try Dashboard
          </a>
          <a href="/debug-stores" style={{ 
            padding: '10px 20px', 
            backgroundColor: '#ff9800', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Manage Stores
          </a>
          <a href="/fix-auth" style={{ 
            padding: '10px 20px', 
            backgroundColor: '#f44336', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Fix Authentication
          </a>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>📋 Raw Test Data</h3>
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
        <details>
          <summary>Click to view full test results</summary>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}