import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const testAddress = url.searchParams.get('address') || '275 Rue Notre-Dame Ouest, Ville-Marie, QC, CA, H2Y 1T8';

  return json({
    testAddress,
    timestamp: new Date().toISOString(),
    endpoints: [
      'https://diylabel.netlify.app/.netlify/functions/geocode',
      '/api/geocode'
    ]
  });
};

export default function TestGeocodeDirect() {
  const { testAddress, endpoints } = useLoaderData<typeof loader>();

  const testGeocoding = async (endpoint: string) => {
    try {
      console.log(`Testing geocoding with endpoint: ${endpoint}`);
      
      const url = `${endpoint}?address=${encodeURIComponent(testAddress)}`;
      console.log('Full URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.lat && data.lng) {
        alert(`✅ Geocoding successful with ${endpoint}!\n\nAddress: ${testAddress}\nCoordinates: ${data.lat}, ${data.lng}\nMapbox result: ${data.address || 'N/A'}`);
      } else {
        alert(`❌ Geocoding failed with ${endpoint}\n\nStatus: ${response.status}\nError: ${data.error || 'Unknown error'}\nDetails: ${data.details || 'No details'}`);
      }
    } catch (error) {
      console.error('Geocoding test error:', error);
      alert(`❌ Network error with ${endpoint}:\n${error.message}`);
    }
  };

  const testMapboxDirect = async () => {
    try {
      // Test Mapbox API directly (this will fail due to CORS, but we can see the error)
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(testAddress)}.json?access_token=YOUR_TOKEN&limit=1&country=CA`;
      
      alert(`🔍 Testing Mapbox API directly:\n\nURL: ${mapboxUrl.replace('YOUR_TOKEN', 'TOKEN_HIDDEN')}\n\nThis will likely fail due to CORS, but check the browser console for details.`);
      
      const response = await fetch(mapboxUrl.replace('YOUR_TOKEN', 'pk.test'));
      console.log('Direct Mapbox test:', response);
    } catch (error) {
      console.error('Direct Mapbox test error:', error);
      alert(`Expected CORS error from direct Mapbox test:\n${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>🧪 Test Geocoding Function</h1>
      
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

      <div style={{ 
        padding: '20px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>🎯 Debugging Geocoding Issues</h2>
        <p><strong>Test Address:</strong> {testAddress}</p>
        <p>This page will help identify why the geocoding function is returning 502 errors and missing CORS headers.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🧪 Test Geocoding Endpoints</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          {endpoints.map((endpoint, index) => (
            <div key={index} style={{ 
              padding: '20px', 
              border: '1px solid #007cba',
              borderRadius: '8px'
            }}>
              <h3>Test Endpoint {index + 1}</h3>
              <p><strong>URL:</strong> <code>{endpoint}</code></p>
              <button
                onClick={() => testGeocoding(endpoint)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007cba',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Test {endpoint.includes('netlify') ? 'Netlify Function' : 'Remix API'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔍 Direct Tests</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #28a745',
            borderRadius: '8px'
          }}>
            <h3>Test Mapbox API Directly</h3>
            <p>This will test the Mapbox API directly (expected to fail due to CORS).</p>
            <button
              onClick={testMapboxDirect}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Test Mapbox Direct
            </button>
          </div>

          <div style={{ 
            padding: '20px', 
            border: '1px solid #ff9800',
            borderRadius: '8px'
          }}>
            <h3>Test Environment Variables</h3>
            <p>Check if the Mapbox token is properly configured.</p>
            <button
              onClick={() => {
                fetch('/api/geocode?address=test')
                  .then(response => response.json())
                  .then(data => {
                    if (data.error && data.error.includes('not configured')) {
                      alert('❌ Mapbox token is not configured in environment variables');
                    } else {
                      alert('✅ Mapbox token appears to be configured');
                    }
                  })
                  .catch(error => {
                    alert('❌ Error testing environment: ' + error.message);
                  });
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Check Environment
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Common Issues & Solutions</h2>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <h4>Possible Causes of 502 Error:</h4>
          <ol>
            <li><strong>Missing Mapbox Token:</strong> VITE_MAPBOX_TOKEN not set in Netlify environment</li>
            <li><strong>Invalid Mapbox Token:</strong> Token is expired or incorrect</li>
            <li><strong>Function Timeout:</strong> Mapbox API taking too long to respond</li>
            <li><strong>Network Issues:</strong> Netlify can't reach Mapbox API</li>
            <li><strong>Function Error:</strong> JavaScript error in the function code</li>
          </ol>
          
          <h4>Solutions:</h4>
          <ol>
            <li><strong>Check Netlify Environment:</strong> Go to Netlify dashboard → Site settings → Environment variables</li>
            <li><strong>Verify Mapbox Token:</strong> Test token at <a href="https://account.mapbox.com" target="_blank">Mapbox Account</a></li>
            <li><strong>Check Function Logs:</strong> Go to Netlify dashboard → Functions → View logs</li>
            <li><strong>Test Locally:</strong> Run netlify dev to test functions locally</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Manual Test URLs</h2>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h4>Test these URLs directly in your browser:</h4>
          <ul>
            <li>
              <a 
                href={`https://diylabel.netlify.app/.netlify/functions/geocode?address=${encodeURIComponent(testAddress)}`}
                target="_blank"
                style={{ color: '#007cba' }}
              >
                Netlify Function Test →
              </a>
            </li>
            <li>
              <a 
                href={`/api/geocode?address=${encodeURIComponent(testAddress)}`}
                target="_blank"
                style={{ color: '#007cba' }}
              >
                Remix API Test →
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🔗 Quick Links</h3>
        <ul>
          <li><a href="/debug-diy-label-flow">DIY Label Flow Debug</a></li>
          <li><a href="/app">Admin Dashboard</a></li>
          <li><a href="https://diylabel.netlify.app" target="_blank">Netlify Site</a></li>
          <li><a href="https://app.netlify.com" target="_blank">Netlify Dashboard</a></li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px', 
        backgroundColor: '#fee8e8',
        border: '1px solid #f44336',
        borderRadius: '4px'
      }}>
        <h4>🚨 Current Issue</h4>
        <p>
          The geocoding function is returning a 502 error, which typically means:
        </p>
        <ul>
          <li>The Netlify function is crashing or timing out</li>
          <li>Environment variables (like VITE_MAPBOX_TOKEN) are not configured</li>
          <li>There's a JavaScript error in the function code</li>
        </ul>
        <p>
          <strong>Next step:</strong> Check your Netlify dashboard environment variables and function logs.
        </p>
      </div>
    </div>
  );
}