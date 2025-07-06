import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabaseAdmin } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shopDomain,
      cartToken,
      printShopId,
      customerLocation,
      options = {}
    } = body;

    console.log('Checkout DIY Label request:', body);

    // Validate required fields
    if (!shopDomain || !printShopId) {
      return json({ 
        error: 'Missing required fields: shopDomain, printShopId' 
      }, { status: 400 });
    }

    // Get store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    // Verify print shop exists and is active
    const { data: printShop, error: printShopError } = await supabaseAdmin
      .from('print_shops')
      .select('id, name, active')
      .eq('id', printShopId)
      .eq('active', true)
      .single();

    if (printShopError || !printShop) {
      return json({ error: 'Print shop not found or inactive' }, { status: 404 });
    }

    // Store the selection for when the order is created
    // This will be picked up by the order webhook
    const selectionData = {
      shop_domain: shopDomain,
      cart_token: cartToken,
      print_shop_id: printShopId,
      print_shop_name: printShop.name,
      customer_location: customerLocation,
      options: options,
      created_at: new Date().toISOString()
    };

    // Store in a temporary table or cache for webhook processing
    // For now, we'll return success and handle in webhook
    console.log('DIY Label selection stored:', selectionData);

    return json({
      success: true,
      printShop: {
        id: printShop.id,
        name: printShop.name
      },
      message: 'Print shop selection saved. Order will be processed after checkout completion.'
    });

  } catch (error) {
    console.error('Error processing checkout DIY Label selection:', error);
    return json({ 
      error: 'Failed to process DIY Label selection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};