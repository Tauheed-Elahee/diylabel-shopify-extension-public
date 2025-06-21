import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productId = url.searchParams.get('product');

  if (!shopDomain) {
    throw new Response('Shop domain is required', { status: 400 });
  }

  // Get store settings
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (!store) {
    throw new Response('Store not found', { status: 404 });
  }

  // Get product settings if productId is provided
  let productSettings = null;
  if (productId) {
    const { data } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store.id)
      .eq('shopify_product_id', productId)
      .single();
    
    productSettings = data;
  }

  return json({
    store,
    productSettings,
    config: {
      mapboxToken: process.env.VITE_MAPBOX_TOKEN,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY
    }
  });
};

export default function Widget() {
  const { store, productSettings, config } = useLoaderData<typeof loader>();

  // Check if DIY Label is enabled for this product
  if (productSettings && !productSettings.diy_label_enabled) {
    return null; // Don't render widget if not enabled
  }

  const settings = store.settings || {};
  const theme = settings.widget_theme || 'light';
  const defaultRadius = settings.default_radius || 25;

  return (
    <div 
      id="diy-label-widget"
      data-shop={store.shop_domain}
      data-product={productSettings?.shopify_product_id}
      data-theme={theme}
      data-radius={defaultRadius}
      data-config={JSON.stringify(config)}
      style={{
        width: '100%',
        minHeight: '400px',
        border: '1px solid #e1e1e1',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          🌱 Choose Local Printing
        </h3>
        <p style={{ margin: '0 0 24px 0', color: theme === 'dark' ? '#cccccc' : '#666666' }}>
          Support your local community and reduce shipping impact by printing this item at a nearby shop.
        </p>
        
        <div style={{ 
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: theme === 'dark' ? '#333333' : '#f5f5f5',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
            📍 Finding print shops near you...
          </p>
        </div>

        {settings.enable_reused_apparel && (
          <div style={{
            padding: '12px',
            backgroundColor: theme === 'dark' ? '#2d4a2d' : '#e8f5e8',
            borderRadius: '6px',
            marginTop: '16px'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              ♻️ Ask about printing on reused apparel for extra sustainability!
            </p>
          </div>
        )}

        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize DIY Label widget
              (function() {
                const widget = document.getElementById('diy-label-widget');
                const config = JSON.parse(widget.dataset.config);
                
                // This would normally load the full interactive widget
                // For now, we'll show a placeholder
                console.log('DIY Label Widget initialized for shop:', widget.dataset.shop);
                console.log('Product ID:', widget.dataset.product);
                console.log('Config:', config);
                
                // In a real implementation, this would:
                // 1. Get user's location
                // 2. Load nearby print shops from the API
                // 3. Display an interactive map
                // 4. Allow print shop selection
                // 5. Handle order placement
              })();
            `
          }}
        />
      </div>
    </div>
  );
}