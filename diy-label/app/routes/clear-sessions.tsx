import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    message: 'Session clearing utility ready'
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'clear-sessions') {
    try {
      // Import session storage
      const { sessionStorage } = await import("../shopify.server");
      
      // Try to clear common session patterns
      const commonShops = [
        'diy-label.myshopify.com',
        'diy-label-test.myshopify.com',
        'test-store.myshopify.com',
        'dev-store.myshopify.com'
      ];

      let clearedCount = 0;
      
      for (const shop of commonShops) {
        try {
          // Try both online and offline session IDs
          const offlineId = `offline_${shop}`;
          const onlineId = `online_${shop}`;
          
          // Attempt to delete sessions
          await sessionStorage.deleteSession(offlineId);
          await sessionStorage.deleteSession(onlineId);
          
          clearedCount++;
        } catch (error) {
          // Session might not exist, continue
          console.log(`Session for ${shop} not found or already cleared`);
        }
      }

      return json({
        success: true,
        message: `Attempted to clear sessions for ${clearedCount} shops`,
        note: 'Some sessions may not have existed'
      });

    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (action === 'clear-browser-instructions') {
    return json({
      success: true,
      instructions: [
        '1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)',
        '2. Select "All time" as the time range',
        '3. Check these items:',
        '   ✅ Cookies and other site data',
        '   ✅ Cached images and files',
        '   ✅ Site settings',
        '   ✅ Hosted app data',
        '4. Click "Delete data"',
        '5. Restart your browser',
        '6. Restart your dev server: shopify app dev'
      ]
    });
  }

  return json({ success: false, error: 'Invalid action' });
};

export default function ClearSessions() {
  const fetcher = useFetcher();

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧹 Clear Authentication Sessions</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <p>This tool helps clear corrupted authentication sessions that might be causing login issues.</p>
      </div>

      {fetcher.data && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: fetcher.data.success ? '#e8f5e8' : '#fee8e8',
          border: `1px solid ${fetcher.data.success ? '#4caf50' : '#f44336'}`,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {fetcher.data.success ? '✅' : '❌'} {fetcher.data.message || fetcher.data.error}
          
          {fetcher.data.instructions && (
            <div style={{ marginTop: '15px' }}>
              <h4>Browser Cleanup Instructions:</h4>
              <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {fetcher.data.instructions.map((instruction, index) => (
                  <li key={index} style={{ margin: '5px 0' }}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}
          
          {fetcher.data.note && (
            <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
              Note: {fetcher.data.note}
            </p>
          )}
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
        <h2>🔧 Session Clearing Options</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #007cba',
            borderRadius: '4px'
          }}>
            <h3>1. Clear Server Sessions</h3>
            <p>Remove stored authentication sessions from the server.</p>
            <button
              onClick={() => fetcher.submit({ action: 'clear-sessions' }, { method: 'POST' })}
              disabled={fetcher.state === 'submitting'}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Server Sessions
            </button>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid \'#ff9800',
            borderRadius: '4px'
          }}>
            <h3>2. Browser Data Cleanup</h3>
            <p>Get step-by-step instructions for clearing browser data.</p>
            <button
              onClick={() => fetcher.submit({ action: 'clear-browser-instructions' }, { method: 'POST' })}
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
              Get Browser Cleanup Instructions
            </button>
          </div>

          <div style={{ 
            padding: '15px', 
            border: '1px solid \'#4caf50',
            borderRadius: '4px'
          }}>
            <h3>3. Complete Reset Process</h3>
            <p>Full step-by-step reset for persistent issues.</p>
            <div style={{ marginTop: '10px' }}>
              <h4>Complete Reset Steps:</h4>
              <ol>
                <li>Click "Clear Server Sessions" above</li>
                <li>Stop your dev server (Ctrl+C in terminal)</li>
                <li>Clear browser data (use instructions above)</li>
                <li>Run: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px' }}>shopify app dev</code></li>
                <li>Click the new installation link</li>
                <li>Complete OAuth flow</li>
                <li>Test authentication</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 After Clearing Sessions</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px'
        }}>
          <h4>Test Your Authentication:</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            <a href="/debug-auth-comparison" style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007cba', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              Test Authentication
            </a>
            <a href="/app" style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              Try Dashboard
            </a>
            <a href="/debug-stores" style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ff9800', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              Check Stores
            </a>
          </div>
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px'
      }}>
        <h3>⚠️ Important Notes</h3>
        <ul>
          <li><strong>Server sessions:</strong> Clearing these will log out all users</li>
          <li><strong>Browser data:</strong> This will clear all cookies and cache</li>
          <li><strong>Development only:</strong> Only use this for development/testing</li>
          <li><strong>Fresh install:</strong> You'll need to reinstall the app after clearing</li>
        </ul>
      </div>
    </div>
  );
}