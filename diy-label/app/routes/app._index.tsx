import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const { data: existingStore, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', session.shop)
      .single();

    let store = existingStore;

    if (storeError && storeError.code === 'PGRST116') {
      const { data: newStore, error: createError } = await supabaseAdmin
        .from('shopify_stores')
        .insert({
          shop_domain: session.shop,
          access_token: session.accessToken,
          scope: session.scope,
          settings: {}
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create store: ${createError.message}`);
      }
      
      store = newStore;
    } else if (storeError) {
      throw new Error(`Database error: ${storeError.message}`);
    }

    if (!store) {
      throw new Error('Failed to get or create store');
    }

    const productsResponse = await admin.graphql(`
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
            }
          }
        }
      }
    `, {
      variables: { first: 50 }
    });

    const productsData = await productsResponse.json();
    const products = productsData.data?.products?.edges || [];

    const productIds = products.map((p: any) => p.node.id.replace('gid://shopify/Product/', ''));
    const { data: productSettings } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store.id)
      .in('shopify_product_id', productIds);

    return json({
      store,
      products,
      productSettings: productSettings || [],
      stats: {
        totalProducts: products.length,
        enabledProducts: productSettings?.filter(p => p.diy_label_enabled).length || 0,
      }
    });

  } catch (error) {
    throw new Error(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'toggle-product') {
    const productId = formData.get('productId') as string;
    const enabled = formData.get('enabled') === 'true';

    try {
      // Get store
      const { data: store, error: storeError } = await supabaseAdmin
        .from('shopify_stores')
        .select('id')
        .eq('shop_domain', session.shop)
        .single();

      if (storeError || !store) {
        throw new Error('Store not found');
      }

      // Upsert product settings
      const { error } = await supabaseAdmin
        .from('product_settings')
        .upsert({
          shopify_store_id: store.id,
          shopify_product_id: productId,
          diy_label_enabled: enabled,
          allow_reused_apparel: false,
          settings: {}
        }, {
          onConflict: 'shopify_store_id,shopify_product_id'
        });

      if (error) {
        throw new Error(`Failed to update product settings: ${error.message}`);
      }

      return json({ success: true });
    } catch (error) {
      console.error('Action error:', error);
      return json({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};

export default function Index() {
  const { store, products, productSettings, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Product settings updated");
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const toggleProduct = (productId: string, currentlyEnabled: boolean) => {
    fetcher.submit(
      {
        action: 'toggle-product',
        productId: productId.replace('gid://shopify/Product/', ''),
        enabled: (!currentlyEnabled).toString()
      },
      { method: 'POST' }
    );
  };

  const getProductSettings = (productId: string) => {
    const cleanId = productId.replace('gid://shopify/Product/', '');
    return productSettings.find(p => p.shopify_product_id === cleanId);
  };

  return (
    <Page>
      <TitleBar title="DIY Label Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Overview
                </Text>
                <InlineStack gap="400">
                  <Text as="p">Total Products: {stats.totalProducts}</Text>
                  <Text as="p">DIY Label Enabled: {stats.enabledProducts}</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Product Settings
                  </Text>
                </InlineStack>
                
                {products.length === 0 ? (
                  <EmptyState
                    heading="No products found"
                  >
                    <p>Add products to your store to enable DIY Label functionality.</p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="300">
                    {products.map((product: any) => {
                      const settings = getProductSettings(product.node.id);
                      const isEnabled = settings?.diy_label_enabled || false;
                      
                      return (
                        <Card key={product.node.id}>
                          <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="h3" variant="headingSm">
                                  {product.node.title}
                                </Text>
                                {isEnabled && (
                                  <Badge status="success">DIY Label Enabled</Badge>
                                )}
                              </BlockStack>
                            
                            <Button
                              variant={isEnabled ? "primary" : "secondary"}
                              onClick={() => toggleProduct(product.node.id, isEnabled)}
                              loading={fetcher.state === 'submitting'}
                            >
                              {isEnabled ? 'Disable' : 'Enable'} DIY Label
                            </Button>
                          </InlineStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}