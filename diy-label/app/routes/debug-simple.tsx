export default function DebugSimple() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>✅ Simple Debug Route Working</h1>
      <p>If you can see this page, Remix routing is working correctly.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Links:</h3>
        <ul>
          <li><a href="/test-order-creation">Test Order Creation</a></li>
          <li><a href="/debug-dashboard">Debug Dashboard</a></li>
          <li><a href="/diagnose-db">Diagnose Database</a></li>
          <li><a href="/app">Main Dashboard</a></li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h4>Current URL Info:</h4>
        <p><strong>Pathname:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'Server-side'}</p>
        <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Server-side'}</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>
    </div>
  );
}