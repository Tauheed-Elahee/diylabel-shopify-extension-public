import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get all stores to show current state
  const { data: stores } = await supabaseAdmin
    .from('shopify_stores')
    .select('*')
    .order('created_at', { ascending: false });

  return json({
    stores: stores || [],
    currentUrl: process.env.SHOPIFY_APP_URL || 'Not set'
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'clear-invalid-stores') {
    try {
      // Delete stores with invalid tokens
      const { data: stores } = await supabaseAdmin
        .from('shopify_stores')
        .select('*');

      let deletedCount = 0;
      
      for (const store of stores || []) {
        // Check if token format is invalid
        if (!store.access_token || 
            (!store.access_token.startsWith('shpat_') && 
             !store.access_token.startsWith('shpca_') && 
             !store.access_token.startsWith('shpss_'))) {
          
          // Delete this store and its related data
          await supabaseAdmin
            .from('diy_label_orders')
            .delete()
            .eq('shopify_store_id', store.id);
          
          await supabaseAdmin
            .from('product_settings')
            .delete()
            .eq('shopify_store_id', store.id);
          
          await supabaseAdmin
            .from('shopify_stores')
            .delete()
            .eq('id', store.id);
          
          deletedCount++;
        }
      }

      return json({ 
        success: true, 
        message: `Deleted ${deletedCount} stores with invalid tokens` 
      });
    } catch (error) {
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  if (action === 'test-fresh-install') {
    // This will help generate a fresh install URL
    return json({
      success: true,
      message: 'Restart your dev server with `shopify app dev` to get a fresh install URL'
    });
  }

  return json({ success: false, error: 'Invalid action' });
};

export default function FixAuth() {
  const { stores, currentUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const invalidStores = stores.filter(store => 
    !store.access_token || 
    (!store.access_token.startsWith('shpat_') && 
     !store.access_token.startsWith('shpca_') && 
     !store.access_token.startsWith('shpss_'))
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1000px' }}>
      <h1>🔧 Fix Authentication Issues</h1>
      
      {fetcher.data && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: fetcher.data.success ? '#e8f5e8' : '#fee8e8',
          border: `1px solid ${fetcher.data.success ? '#4caf50' : '#f44336'}`,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {fetcher.data.success ? '✅' : '❌'} {fetcher.data.message || fetcher.data.error}
        </div>
      )}

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

      <div style={{ marginBottom: '30px' }}>
        <h2>🚨 Common Authentication Issues</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h3>Why Authentication Breaks:</h3>
          <ul>
            <li><strong>Code changes:</strong> Updates can invalidate sessions</li>
            <li><strong>Token expiration:</strong> Shopify tokens have limited lifespans</li>
            <li><strong>Scope changes:</strong> Modified app permissions require re-auth</li>
            <li><strong>Development restarts:</strong> Server restarts can clear sessions</li>
            <li><strong>Browser cache:</strong> Stale cookies interfere with OAuth</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Current Store Status</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <p><strong>Total Stores:</strong> {stores.length}</p>
          <p><strong>Invalid Tokens:</strong> {invalidStores.length}</p>
          <p><strong>Current App URL:</strong> {currentUrl}</p>
        </div>

        {invalidStores.length > 0 && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee8e8',
            border: '1px solid #f44336',
            borderRadius: '4px',
            marginTop: '15px'
          }}>
            <h3>⚠️ Stores with Invalid Tokens:</h3>
            <ul>
              {invalidStores.map(store => (
                <li key={store.id}>
                  <strong>{store.shop_domain}</strong> - 
                  Token: {store.access_token ? store.access_token.substring(0, 10) + '...' : 'Missing'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🛠️ Quick Fixes</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          {invalidStores.length > 0 && (
            <div style={{ 
              padding: '15px', 
              border: '1px solid #ff9800',
              borderRadius: '4px'
            }}>
              <h3>1. Clean Invalid Stores</h3>
              <p>Remove stores with corrupted tokens from the database.</p>
              <button
                onClick={() => fetcher.submit({ action: 'clear-invalid-stores' }, { method: 'POST' })}
                disabled={fetcher.state === 'submitting'}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Invalid Stores ({invalidStores.length})
              </button>
            </div>
          )}

          <div style={{ 
            padding: '15px', 
            border: '1px solid #007cba',
            borderRadius: '4px'
          }}>
            <h3>2. Fresh App Installation</h3>
            <p>The most reliable fix is to reinstall the app completely.</p>
            <div style={{ marginTop: '10px' }}>
              <h4>Steps:</h4>
              <ol>
                <li>Stop your dev server (Ctrl+C)</li>
                <li>Clear browser cache (Ctrl+Shift+Delete)</li>
                <li>Run: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px' }}>shopify app dev</code></li>
                <li>Click the new installation link</li>
                <li>Complete OAuth flow</li>
              </ol>
            </div>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid #4caf50',
            borderRadius: '4px'
          }}>
            <h3>3. Manual Browser Cleanup</h3>
            <p>Clear all browser data for your development domain.</p>
            <div style={{ marginTop: '10px' }}>
              <h4>Chrome/Edge:</h4>
              <ol>
                <li>Press <kbd>Ctrl+Shift+Delete</kbd></li>
                <li>Select "All time"</li>
                <li>Check: Cookies, Cache, Site data</li>
                <li>Click "Delete data"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 Debug Tools</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/debug-auth-status" style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007cba', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Check Auth Status
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
            Detailed Debug
          </a>
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '4px'
      }}>
        <h3>💡 Prevention Tips</h3>
        <ul>
          <li><strong>Regular cleanup:</strong> Remove old test stores periodically</li>
          <li><strong>Fresh installs:</strong> Reinstall after major code changes</li>
          <li><strong>Monitor tokens:</strong> Check token formats in debug tools</li>
          <li><strong>Clear cache:</strong> Clear browser data when switching between stores</li>
          <li><strong>Use incognito:</strong> Test in private browsing for clean sessions</li>
        </ul>
      </div>
    </div>
  );
}