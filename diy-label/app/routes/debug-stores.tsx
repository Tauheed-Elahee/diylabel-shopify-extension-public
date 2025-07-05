import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get all stores with their details
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (storesError) {
      throw storesError;
    }

    // Get counts for each store
    const storeStats = await Promise.all(
      (stores || []).map(async (store) => {
        // Get product settings count
        const { count: productCount } = await supabaseAdmin
          .from('product_settings')
          .select('*', { count: 'exact', head: true })
          .eq('shopify_store_id', store.id);

        // Get orders count
        const { count: ordersCount } = await supabaseAdmin
          .from('diy_label_orders')
          .select('*', { count: 'exact', head: true })
          .eq('shopify_store_id', store.id);

        return {
          ...store,
          productCount: productCount || 0,
          ordersCount: ordersCount || 0
        };
      })
    );

    return json({
      stores: storeStats,
      totalStores: stores?.length || 0
    });

  } catch (error) {
    console.error('Error loading stores:', error);
    return json({
      stores: [],
      totalStores: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get('action');
  const storeId = formData.get('storeId');

  if (action === 'delete-store' && storeId) {
    try {
      // Delete the store (this will cascade delete related records)
      const { error } = await supabaseAdmin
        .from('shopify_stores')
        .delete()
        .eq('id', storeId);

      if (error) {
        throw error;
      }

      return json({ success: true, message: 'Store deleted successfully' });
    } catch (error) {
      console.error('Error deleting store:', error);
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  if (action === 'delete-all-stores') {
    try {
      // Delete all stores
      const { error } = await supabaseAdmin
        .from('shopify_stores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

      if (error) {
        throw error;
      }

      return json({ success: true, message: 'All stores deleted successfully' });
    } catch (error) {
      console.error('Error deleting all stores:', error);
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return json({ success: false, error: 'Invalid action' });
};

export default function DebugStores() {
  const { stores, totalStores, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const deleteStore = (storeId: string, shopDomain: string) => {
    if (confirm(`Are you sure you want to delete store "${shopDomain}"?\n\nThis will also delete:\n- All product settings\n- All DIY Label orders\n- All related data\n\nThis action cannot be undone.`)) {
      fetcher.submit(
        { action: 'delete-store', storeId },
        { method: 'POST' }
      );
    }
  };

  const deleteAllStores = () => {
    if (confirm(`⚠️ DANGER: Delete ALL stores?\n\nThis will permanently delete:\n- All ${totalStores} stores\n- All product settings\n- All DIY Label orders\n- All related data\n\nThis action cannot be undone.\n\nType "DELETE ALL" to confirm.`)) {
      const confirmation = prompt('Type "DELETE ALL" to confirm:');
      if (confirmation === 'DELETE ALL') {
        fetcher.submit(
          { action: 'delete-all-stores' },
          { method: 'POST' }
        );
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTokenStatus = (token: string) => {
    if (!token) return { status: 'missing', color: '#f44336' };
    if (token.startsWith('shpat_')) return { status: 'valid', color: '#4caf50' };
    if (token.startsWith('shpca_')) return { status: 'valid', color: '#4caf50' };
    if (token.startsWith('shpss_')) return { status: 'valid', color: '#4caf50' };
    return { status: 'invalid', color: '#ff9800' };
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px' }}>
      <h1>🏪 Store Management</h1>
      
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee8e8',
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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

      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Overview</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <p><strong>Total Stores:</strong> {totalStores}</p>
          <p><strong>Total Product Settings:</strong> {stores.reduce((sum, store) => sum + store.productCount, 0)}</p>
          <p><strong>Total Orders:</strong> {stores.reduce((sum, store) => sum + store.ordersCount, 0)}</p>
        </div>
      </div>

      {totalStores > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>🗂️ Store Details</h2>
            <button
              onClick={deleteAllStores}
              disabled={fetcher.state === 'submitting'}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Delete All Stores
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Shop Domain</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Token Status</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Products</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Orders</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Created</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => {
                  const tokenStatus = getTokenStatus(store.access_token);
                  return (
                    <tr key={store.id}>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                        <strong>{store.shop_domain}</strong>
                        <br />
                        <small style={{ color: '#666' }}>ID: {store.id}</small>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                        <span style={{ 
                          color: tokenStatus.color, 
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {tokenStatus.status.toUpperCase()}
                        </span>
                        <br />
                        <small style={{ color: '#666', fontFamily: 'monospace' }}>
                          {store.access_token ? store.access_token.substring(0, 10) + '...' : 'No token'}
                        </small>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                        {store.productCount}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                        {store.ordersCount}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                        <small>{formatDate(store.created_at)}</small>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                        <span style={{ 
                          color: store.active ? '#4caf50' : '#f44336',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {store.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteStore(store.id, store.shop_domain)}
                          disabled={fetcher.state === 'submitting'}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalStores === 0 && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h3>No stores found</h3>
          <p>Install the app on a Shopify development store to see stores here.</p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>💡 Recommendations</h3>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px'
        }}>
          <h4>When to Delete Stores:</h4>
          <ul>
            <li><strong>Invalid tokens:</strong> If token status shows "INVALID"</li>
            <li><strong>Old test stores:</strong> Stores you no longer use for testing</li>
            <li><strong>Clean slate:</strong> Starting fresh for production</li>
            <li><strong>Domain changes:</strong> If store domains have changed</li>
          </ul>
          
          <h4>When to Keep Stores:</h4>
          <ul>
            <li><strong>Active development:</strong> Still testing with these stores</li>
            <li><strong>Valid data:</strong> Contains important product settings or orders</li>
            <li><strong>Production stores:</strong> Real stores using the app</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/app">Back to Dashboard</a></li>
          <li><a href="/debug-shopify-auth">Check Shopify Auth</a></li>
          <li><a href="/diagnose-db">Database Diagnosis</a></li>
        </ul>
      </div>
    </div>
  );
}