        export default function Widget() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center', 
      maxWidth: '600px',
      padding: '40px 20px', 
      margin: '0 auto'
    }}>
      <h2 style={{ margin: '0 0 16px 0', color: '#333' }}>
        🌱 DIY Label Widget
      </h2>
      <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px' }}>
        The DIY Label widget is now integrated directly into your theme using our app embed blocks.
      </p>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e1e1e1'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>How to Use:</h3>
        <ol style={{ textAlign: 'left', margin: '0', paddingLeft: '20px' }}>
          <li>Go to your Shopify admin</li>
          <li>Navigate to <strong>Online Store → Themes</strong></li>
          <li>Click <strong>Customize</strong> on your active theme</li>
          <li>Add the <strong>DIY Label</strong> app block to your product pages</li>
          <li>Configure the settings and save</li>
        </ol>
      </div>
      <p style={{ margin: '24px 0 0 0', fontSize: '14px', color: '#888' }}>
        The widget will automatically appear on product pages where DIY Label is enabled.
      </p>
    </div>
  );
}