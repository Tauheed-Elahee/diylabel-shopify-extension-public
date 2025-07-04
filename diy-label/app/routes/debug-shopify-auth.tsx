import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop') || 'diy-label.myshopify.com';

  try {
    // Get store from database
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({
        success: false,
        error: 'Store not found in database',
        shopDomain,
        storeError
      });
    }

    // Check if access token looks valid
    const tokenInfo = {
      exists: !!store.access_token,
      length: store.access_token?.length || 0,
      prefix: store.access_token?.substring(0, 10) || 'No token',
      isValidFormat: store.access_token?.startsWith('shpat_') || store.access_token?.startsWith('shpca_') || false
    };

    // Test the access token with a simple API call
    const shopifyApiUrl = `https://${shopDomain}/admin/api/2023-10/shop.json`;
    
    const response = await fetch(shopifyApiUrl, {
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    let responseData = null;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    // Get response headers for debugging
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Test product API specifically
    let productTestResult = null;
    if (response.ok) {
      const productResponse = await fetch(
        `https://${shopDomain}/admin/api/2023-10/products.json?limit=1&fields=id,title,handle`,
        {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      const productText = await productResponse.text();
      try {
        productTestResult = {
          status: productResponse.status,
          ok: productResponse.ok,
          data: JSON.parse(productText)
        };
      } catch (e) {
        productTestResult = {
          status: productResponse.status,
          ok: productResponse.ok,
          data: productText
        };
      }
    }

    return json({
      success: response.ok,
      store: {
        id: store.id,
        shop_domain: store.shop_domain,
        scope: store.scope,
        active: store.active,
        created_at: store.created_at,
        access_token_preview: store.access_token ? store.access_token.substring(0, 10) + '...' : 'No token',
        token_info: tokenInfo
      },
      shopifyApiTest: {
        url: shopifyApiUrl,
        status: response.status,
        ok: response.ok,
        headers: responseHeaders,
        data: responseData
      },
      productApiTest: productTestResult,
      recommendations: response.ok ? ['✅ Authentication is working correctly!'] : [
        `❌ HTTP ${response.status}: ${response.statusText}`,
        tokenInfo.isValidFormat ? '✅ Token format looks correct' : '❌ Token format is invalid',
        `Token length: ${tokenInfo.length} characters`,
        'Try these fixes:',
        '1. Uninstall the app completely from Shopify admin',
        '2. Clear browser cache and cookies',
        '3. Reinstall the app with fresh OAuth flow',
        '4. Check if the app is active in Partners Dashboard',
        '5. Verify the shop domain matches exactly'
      ]
    });

  } catch (error) {
    return json({
      success: false,
      error: 'Failed to test Shopify authentication',
      details: error instanceof Error ? error.message : 'Unknown error',
      shopDomain
    });
  }
};

export default function DebugShopifyAuth() {
  const result = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>Shopify Authentication Debug</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Store Information</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: result.success ? '#e8f5e8' : '#fee8e8',
          border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`,
          borderRadius: '4px'
        }}>
          <p><strong>Status:</strong> {result.success ? '✅ Authentication Working' : '❌ Authentication Failed'}</p>
          {result.store && (
            <>
              <p><strong>Shop Domain:</strong> {result.store.shop_domain}</p>
              <p><strong>Store ID:</strong> {result.store.id}</p>
              <p><strong>Scope:</strong> {result.store.scope}</p>
              <p><strong>Active:</strong> {result.store.active ? 'Yes' : 'No'}</p>
              <p><strong>Created:</strong> {new Date(result.store.created_at).toLocaleString()}</p>
              <p><strong>Access Token:</strong> {result.store.access_token_preview}</p>
            </>
          )}
        </div>
      </div>

      {result.shopifyApiTest && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Shopify API Test (Shop Info)</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: result.shopifyApiTest.ok ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${result.shopifyApiTest.ok ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <p><strong>URL:</strong> {result.shopifyApiTest.url}</p>
            <p><strong>Status:</strong> {result.shopifyApiTest.status}</p>
            <p><strong>Success:</strong> {result.shopifyApiTest.ok ? 'Yes' : 'No'}</p>
            
            <h4>Response Data:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto',
              fontSize: '12px',
              maxHeight: '200px'
            }}>
              {JSON.stringify(result.shopifyApiTest.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {result.productApiTest && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Product API Test</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: result.productApiTest.ok ? '#e8f5e8' : '#fee8e8',
            border: `1px solid ${result.productApiTest.ok ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}>
            <p><strong>Status:</strong> {result.productApiTest.status}</p>
            <p><strong>Success:</strong> {result.productApiTest.ok ? 'Yes' : 'No'}</p>
            
            <h4>Response Data:</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto',
              fontSize: '12px',
              maxHeight: '200px'
            }}>
              {JSON.stringify(result.productApiTest.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {result.recommendations && result.recommendations.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Recommendations</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px'
          }}>
            <ul>
              {result.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.error && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Error Details</h2>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee8e8',
            border: '1px solid #f44336',
            borderRadius: '4px'
          }}>
            <p><strong>Error:</strong> {result.error}</p>
            {result.details && <p><strong>Details:</strong> {result.details}</p>}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '4px' }}>
        <h3>Quick Fixes</h3>
        <ol>
          <li><strong>Reinstall the app:</strong> Go to your Shopify admin → Apps → DIY Label → Uninstall, then reinstall</li>
          <li><strong>Check app permissions:</strong> Ensure the app has read_products and write_products scopes</li>
          <li><strong>Verify shop domain:</strong> Make sure you're using the correct shop domain</li>
          <li><strong>Check app status:</strong> Ensure the app is active in Shopify Partners Dashboard</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Test URLs</h3>
        <ul>
          <li><a href="?shop=diy-label.myshopify.com">Test diy-label.myshopify.com</a></li>
          <li><a href="/app">Go to Admin Dashboard</a></li>
          <li><a href="/diagnose-db">Database Diagnosis</a></li>
        </ul>
      </div>
    </div>
  );
}