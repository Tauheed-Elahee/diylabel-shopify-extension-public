import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');
  const productId = url.searchParams.get('product');

  if (!shopDomain || !productId) {
    return json({ error: 'Missing shop domain or product ID' }, { status: 400 });
  }

  try {
    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({ enabled: false, error: 'Store not found' });
    }

    // Get product settings
    const { data: productSettings, error: settingsError } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store.id)
      .eq('shopify_product_id', productId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching product settings:', settingsError);
      return json({ enabled: false, error: 'Database error' });
    }

    // Return settings or default values
    return json({
      enabled: productSettings?.diy_label_enabled || false,
      allowReusedApparel: productSettings?.allow_reused_apparel || false,
      settings: productSettings?.settings || {}
    });

  } catch (error) {
    console.error('Error in product-settings API:', error);
    return json({ 
      enabled: false, 
      error: 'Failed to fetch product settings' 
    }, { status: 500 });
  }
};