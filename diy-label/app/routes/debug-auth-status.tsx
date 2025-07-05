import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop') || 'diy-label.myshopify.com';

  try {
    // Check if we can access the authenticate function
    let authStatus = 'unknown';
    let sessionInfo = null;
    let authError = null;

    try {
      // Try to import and use authenticate
      const { authenticate } = await import("../shopify.server");
      const { admin, session } = await authenticate.admin(request);
      
      authStatus = 'success';
      sessionInfo = {
        shop: session.shop,
        scope: session.scope,
        isOnline: session.isOnline,
        accessToken: session.accessToken ? session.accessToken.substring(0, 10) + '...' : 'No token'
      };
    } catch (error) {
      authStatus = 'failed';
      authError = error instanceof Error ? error.message : 'Unknown auth error';
    }

    // Check database store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    // Test Shopify API if we have a token
    let apiTest = null;
    if (store?.access_token) {
      try {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        });

        apiTest = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };

        if (response.ok) {
          const data = await response.json();
          apiTest.shopName = data.shop?.name;
        }
      } catch (error) {
        apiTest = {
          error: error instanceof Error ? error.message : 'API test failed'
        };
      }
    }

    return json({
      authStatus,
      sessionInfo,
      authError,
      store: store ? {
        id: store.id,
        shop_domain: store.shop_domain,
        access_token_preview: store.access_token ? store.access_token.substring(0, 10) + '...' : 'No token',
        token_format: store.access_token ? (
          store.access_token.startsWith('shpat_') ? 'Valid (Private App)' :
          store.access_token.startsWith('shpca_') ? 'Valid (Custom App)' :
          store.access_token.startsWith('shpss_') ? 'Valid (Session)' :
          'Invalid Format'
        ) : 'No Token',
        scope: store.scope,
        active: store.active,
        created_at: store.created_at,
        updated_at: store.updated_at
      } : null,
      storeError: storeError?.message,
      apiTest,
      recommendations: generateRecommendations(authStatus, store, apiTest)
    });

  } catch (error) {
    return json({
      authStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: ['Check server logs for detailed error information']
    });
  }
};

function generateRecommendations(authStatus: string, store: any, apiTest: any) {
  const recommendations = [];

  if (authStatus === 'failed') {
    recommendations.push('🔄 **SOLUTION: Reinstall the app**');
    recommendations.push('1. Go to Shopify Admin → Settings → Apps and sales channels');
    recommendations.push('2. Find "DIY Label" app and click Uninstall');
    recommendations.push('3. Clear browser cache (Ctrl+Shift+Delete)');
    recommendations.push('4. Restart: `shopify app dev`');
    recommendations.push('5. Click the new installation link');
    recommendations.push('6. Complete OAuth flow with fresh permissions');
  }

  if (store && apiTest && !apiTest.ok) {
    recommendations.push('🔑 **Token Issue Detected**');
    recommendations.push(`API returned: HTTP ${apiTest.status} ${apiTest.statusText}`);
    
    if (apiTest.status === 401) {
      recommendations.push('• Token is expired or invalid');
      recommendations.push('• App needs to be reinstalled');
    } else if (apiTest.status === 403) {
      recommendations.push('• Insufficient permissions');
      recommendations.push('• Check app scopes in Partners Dashboard');
    }
  }

  if (!store) {
    recommendations.push('📝 **Store Not Found**');
    recommendations.push('• Install the app on your development store');
    recommendations.push('• Check that OAuth completed successfully');
  }

  if (store && store.access_token && !store.access_token.startsWith('shp')) {
    recommendations.push('⚠️ **Invalid Token Format**');
    recommendations.push('• Token should start with "shpat_", "shpca_", or "shpss_"');
    recommendations.push('• Current token appears corrupted');
    recommendations.push('• Reinstall required');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ **Authentication looks good!**');
    recommendations.push('• All checks passed');
    recommendations.push('• Try accessing the dashboard again');
  }

  return recommendations;
}

export default function DebugAuthStatus() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>🔐 Authentication Status Check</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Overall Status</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: data.authStatus === 'success' ? '#e8f5e8' : '#fee8e8',
          border: `1px solid ${data.authStatus === 'success' ? '#4caf50' : '#f44336'}`,
          borderRadius: '4px'
        }}>
          <p><strong>Authentication:</strong> {
            data.authStatus === 'success' ? '✅ Working' :
            data.authStatus === 'failed' ? '❌ Failed' :
            data.authStatus === 'error' ? '🚨 Error' : '❓ Unknown'
          }</p>
          {data.authError && <p><strong>Error:</strong> {data.authError}</p>}
          {data.error && <p><strong>System Error:</strong> {data.error}</p>}
        </div>
      </div>

      {data.sessionInfo && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Current Session</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px'
          }}>
            <p><strong>Shop:</strong> {data.sessionInfo.shop}</p>
            <p><strong>Scope:</strong> {data.sessionInfo.scope}</p>
            <p><strong>Online:</strong> {data.sessionInfo.isOnline ? 'Yes' : 'No'}</p>
            <p><strong>Token:</strong> {data.sessionInfo.accessToken}</p>
          </div>
        </div>
      )}

      {data.store && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Database Store Record</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <p><strong>Shop Domain:</strong> {data.store.shop_domain}</p>
            <p><strong>Token Format:</strong> {data.store.token_format}</p>
            <p><strong>Token Preview:</strong> {data.store.access_token_preview}</p>
            <p><strong>Scope:</strong> {data.store.scope}</p>
            <p><strong>Active:</strong> {data.store.active ? 'Yes' : 'No'}</p>
            <p><strong>Created:</strong> {new Date(data.store.created_at).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(data.store.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}

      {data.storeError && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Database Error</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee8e8',
            border: '1px solid #f44336',
            borderRadius: '4px'
          }}>
            <p><strong>Error:</strong> {data.storeError}</p>
          </div>
        </div>
      )}

      {data.apiTest && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Shopify API Test</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: data.apiTest.ok ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${data.apiTest.ok ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            {data.apiTest.error ? (
              <p><strong>Error:</strong> {data.apiTest.error}</p>
            ) : (
              <>
                <p><strong>Status:</strong> {data.apiTest.status} {data.apiTest.statusText}</p>
                <p><strong>Success:</strong> {data.apiTest.ok ? 'Yes' : 'No'}</p>
                {data.apiTest.shopName && <p><strong>Shop Name:</strong> {data.apiTest.shopName}</p>}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>Recommendations</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          {data.recommendations.map((rec, index) => (
            <p key={index} style={{ margin: '5px 0' }}>{rec}</p>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Quick Actions</h3>
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
          <a href="/debug-shopify-auth" style={{ 
            padding: '10px 20px', 
            backgroundColor: '#9c27b0', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Detailed Auth Debug
          </a>
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h3>🚀 Quick Fix Steps</h3>
        <ol>
          <li><strong>Stop the dev server:</strong> Press Ctrl+C in terminal</li>
          <li><strong>Clear browser data:</strong> Ctrl+Shift+Delete → All time → Cookies + Cache</li>
          <li><strong>Restart server:</strong> <code>shopify app dev</code></li>
          <li><strong>Fresh install:</strong> Click the new installation link</li>
          <li><strong>Complete OAuth:</strong> Grant all permissions</li>
          <li><strong>Test again:</strong> Visit this debug page</li>
        </ol>
      </div>
    </div>
  );
}