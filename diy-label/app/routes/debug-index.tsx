import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return json({
    baseUrl,
    timestamp: new Date().toISOString(),
    debugPages: [
      {
        title: "🔍 DIY Label Flow Debug",
        url: "/debug-diy-label-flow",
        description: "Complete system status check - store, products, print shops, and integration flow",
        category: "Primary"
      },
      {
        title: "🚀 Function Deployment",
        url: "/debug-function-deployment",
        description: "Deploy and verify the Shopify Function for local pickup options",
        category: "Primary"
      },
      {
        title: "🧪 Cart Attributes Test",
        url: "/test-cart-attributes",
        description: "Test cart attribute functionality that the checkout function depends on",
        category: "Primary"
      },
      {
        title: "🔧 Order Creation Test",
        url: "/test-order-creation",
        description: "Test the DIY Label order creation API with sample data",
        category: "API Testing"
      },
      {
        title: "🏪 Store Management",
        url: "/debug-stores",
        description: "View and manage connected Shopify stores and their data",
        category: "Store Management"
      },
      {
        title: "🔐 Authentication Status",
        url: "/debug-auth-status",
        description: "Check Shopify authentication and token validity",
        category: "Authentication"
      },
      {
        title: "🔍 Auth Comparison",
        url: "/debug-auth-comparison",
        description: "Detailed authentication analysis and troubleshooting",
        category: "Authentication"
      },
      {
        title: "🔑 Shopify Auth Debug",
        url: "/debug-shopify-auth",
        description: "Test Shopify API calls and token functionality",
        category: "Authentication"
      },
      {
        title: "🗄️ Database Diagnosis",
        url: "/diagnose-db",
        description: "Check database schema, tables, and data integrity",
        category: "Database"
      },
      {
        title: "📊 Dashboard Debug",
        url: "/debug-dashboard",
        description: "Debug the admin dashboard loading process",
        category: "Dashboard"
      },
      {
        title: "🧹 Clear Sessions",
        url: "/clear-sessions",
        description: "Clear authentication sessions and browser data",
        category: "Utilities"
      },
      {
        title: "🔧 Fix Authentication",
        url: "/fix-auth",
        description: "Automated authentication troubleshooting and fixes",
        category: "Utilities"
      },
      {
        title: "✅ Simple Debug",
        url: "/debug-simple",
        description: "Basic connectivity test to verify routing is working",
        category: "Basic"
      }
    ]
  });
};

export default function DebugIndex() {
  const { baseUrl, debugPages, timestamp } = useLoaderData<typeof loader>();

  const categories = [...new Set(debugPages.map(page => page.category))];

  const getStatusColor = (category: string) => {
    const colors = {
      'Primary': '#007cba',
      'API Testing': '#28a745',
      'Store Management': '#ff9800',
      'Authentication': '#9c27b0',
      'Database': '#f44336',
      'Dashboard': '#2196f3',
      'Utilities': '#795548',
      'Basic': '#607d8b'
    };
    return colors[category] || '#666';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>🔍 DIY Label Debug Center</h1>
        <p style={{ margin: '0', color: '#666', fontSize: '16px' }}>
          Comprehensive debugging tools for DIY Label Shopify integration
        </p>
        <p style={{ margin: '10px 0 0 0', color: '#888', fontSize: '14px' }}>
          Last updated: {new Date(timestamp).toLocaleString()}
        </p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>🚀 Quick Start Guide</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>1. First Time Setup</h4>
              <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Check <strong>DIY Label Flow Debug</strong></li>
                <li>Verify database and store connection</li>
                <li>Enable products in admin dashboard</li>
              </ol>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>2. Checkout Issues</h4>
              <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Use <strong>Cart Attributes Test</strong></li>
                <li>Deploy function: <code>shopify app deploy</code></li>
                <li>Test in checkout with cart items</li>
              </ol>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>3. Authentication Problems</h4>
              <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Check <strong>Authentication Status</strong></li>
                <li>Use <strong>Fix Authentication</strong> if needed</li>
                <li>Clear sessions and reinstall app</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            margin: '0 0 15px 0', 
            color: getStatusColor(category),
            borderBottom: `2px solid ${getStatusColor(category)}`,
            paddingBottom: '5px'
          }}>
            {category} Tools
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: '15px' 
          }}>
            {debugPages
              .filter(page => page.category === category)
              .map(page => (
                <div key={page.url} style={{ 
                  padding: '20px', 
                  border: `1px solid ${getStatusColor(category)}`,
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => window.location.href = page.url}>
                  <h3 style={{ 
                    margin: '0 0 10px 0', 
                    color: getStatusColor(category),
                    fontSize: '18px'
                  }}>
                    {page.title}
                  </h3>
                  <p style={{ 
                    margin: '0 0 15px 0', 
                    color: '#666', 
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {page.description}
                  </p>
                  <a 
                    href={page.url}
                    style={{ 
                      color: getStatusColor(category), 
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open Tool →
                  </a>
                </div>
              ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '40px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>🔗 External Links</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>Admin Dashboard</h4>
              <a href="/app" style={{ color: '#007cba', textDecoration: 'none' }}>
                DIY Label Admin →
              </a>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>Customer Widget</h4>
              <a href="/widget?shop=diy-label.myshopify.com" style={{ color: '#007cba', textDecoration: 'none' }}>
                Test Widget →
              </a>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>API Endpoints</h4>
              <a href="/api/print-shops/nearby?lat=37.7749&lng=-122.4194&radius=25" style={{ color: '#007cba', textDecoration: 'none' }}>
                Print Shops API →
              </a>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>Shopify Store</h4>
              <a href="https://diy-label.myshopify.com/admin" target="_blank" style={{ color: '#007cba', textDecoration: 'none' }}>
                Store Admin →
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#856404' }}>💡 Common Issues & Solutions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Pickup Option Not Showing</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Deploy function: <code>shopify app deploy</code></li>
                <li>Enable products in admin dashboard</li>
                <li>Set cart attributes using test page</li>
                <li>Ensure products are in cart</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Authentication Errors</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Check token format (should start with shpat_)</li>
                <li>Use "Fix Authentication" tool</li>
                <li>Reinstall app if tokens are corrupted</li>
                <li>Clear browser cache completely</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Database Issues</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Check "Database Diagnosis" page</li>
                <li>Verify Supabase connection</li>
                <li>Ensure all tables exist</li>
                <li>Check print shops data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid #eee'
      }}>
        <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
          DIY Label Debug Center • Built for comprehensive troubleshooting
        </p>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px' }}>
          Base URL: {baseUrl}
        </p>
      </div>
    </div>
  );
}