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
  DataTable,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get store from database or create if doesn't exist
    const { data: existingStore, error: storeError } = await supabaseAdmin
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', session.shop)
      .single();

    let store = existingStore;

    // If store doesn't exist, create it
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
        console.error('Failed to create store:', createError);
        throw new Error(`Failed to create store: ${createError.message}`);
      }
      
      store = newStore;
    } else if (storeError) {
      console.error('Database error:', storeError);
      throw new Error(`Database error: ${storeError.message}`);
    }

    // Ensure we have a valid store
    if (!store) {
      throw new Error('Failed to get or create store');
    }

    // Get products with DIY Label settings
    const productsResponse = await admin.graphql(`
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              totalInventory
              createdAt
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: { first: 50 }
    });

    const productsData = await productsResponse.json();
    const products = productsData.data?.products?.edges || [];

    // Get product settings from database
    const productIds = products.map((p: any) => p.node.id.replace('gid://shopify/Product/', ''));
    const { data: productSettings } = await supabaseAdmin
      .from('product_settings')
      .select('*')
      .eq('shopify_store_id', store.id)
      .in('shopify_product_id', productIds);

    // Get recent DIY Label orders
    const { data: recentOrders } = await supabaseAdmin
      .from('diy_label_orders')
      .select(`
        *,
        print_shops (
          name,
          address
        )
      `)
      .eq('shopify_store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get print shops count
    const { count: printShopsCount } = await supabaseAdmin
      .from('print_shops')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    return json({
      store,
      products,
      productSettings: productSettings || [],
      recentOrders: recentOrders || [],
      stats: {
        totalProducts: products.length,
        enabledProducts: productSettings?.filter(p => p.diy_label_enabled).length || 0,
        totalOrders: recentOrders?.length || 0,
        printShops: printShopsCount || 0
      }
    });

  } catch (error) {
    console.error('Loader error:', error);
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
  const { store, products, productSettings, recentOrders, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Product settings updated");
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const toggleProduct = (productId: string, currentlyEnabled: boolean) => {
    setIsLoading(true);
    fetcher.submit(
      {
        action: 'toggle-product',
        productId: productId.replace('gid://shopify/Product/', ''),
        enabled: (!currentlyEnabled).toString()
      },
      { method: 'POST' }
    );
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getProductSettings = (productId: string) => {
    const cleanId = productId.replace('gid://shopify/Product/', '');
    return productSettings.find(p => p.shopify_product_id === cleanId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const orderRows = recentOrders.map(order => [
    order.shopify_order_id,
    order.print_shops?.name || 'Unassigned',
    <Badge key={order.id} status={
      order.status === 'completed' ? 'success' :
      order.status === 'cancelled' ? 'critical' :
      order.status === 'printing' ? 'attention' : 'info'
    }>
      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
    </Badge>,
    formatDate(order.created_at)
  ]);

  return (
    <Page>
      <TitleBar title="DIY Label Dashboard" />
      <BlockStack gap="500">
        {/* Stats Overview */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Overview
                </Text>
                <Layout>
                  <Layout.Section oneQuarter>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" color="subdued">
                          Total Products
                        </Text>
                        <Text as="p" variant="headingLg">
                          {stats.totalProducts}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section oneQuarter>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" color="subdued">
                          DIY Label Enabled
                        </Text>
                        <Text as="p" variant="headingLg">
                          {stats.enabledProducts}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section oneQuarter>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" color="subdued">
                          Recent Orders
                        </Text>
                        <Text as="p" variant="headingLg">
                          {stats.totalOrders}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section oneQuarter>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" color="subdued">
                          Partner Print Shops
                        </Text>
                        <Text as="p" variant="headingLg">
                          {stats.printShops}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Products Management */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Product Settings
                  </Text>
                  <Text as="p" variant="bodyMd" color="subdued">
                    Enable DIY Label for specific products
                  </Text>
                </InlineStack>
                
                {products.length === 0 ? (
                  <EmptyState
                    heading="No products found"
                    action={{
                      content: 'Add products',
                      url: `shopify:admin/products`
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
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
                            <InlineStack gap="400" blockAlign="center">
                              {product.node.images.edges[0] && (
                                <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
                                  <img 
                                    src={product.node.images.edges[0].node.url}
                                    alt={product.node.images.edges[0].node.altText || product.node.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                              )}
                              <BlockStack gap="100">
                                <Text as="h3" variant="headingSm">
                                  {product.node.title}
                                </Text>
                                <InlineStack gap="200">
                                  <Badge status={product.node.status === 'ACTIVE' ? 'success' : 'info'}>
                                    {product.node.status.toLowerCase()}
                                  </Badge>
                                  {isEnabled && (
                                    <Badge status="attention">DIY Label Enabled</Badge>
                                  )}
                                </InlineStack>
                              </BlockStack>
                            </InlineStack>
                            
                            <InlineStack gap="200">
                              <Button
                                variant={isEnabled ? "primary" : "secondary"}
                                onClick={() => toggleProduct(product.node.id, isEnabled)}
                                loading={isLoading && fetcher.formData?.get('productId') === product.node.id.replace('gid://shopify/Product/', '')}
                              >
                                {isEnabled ? 'Disable' : 'Enable'} DIY Label
                              </Button>
                              <Button
                                url={`shopify:admin/products/${product.node.id.replace('gid://shopify/Product/', '')}`}
                                target="_blank"
                                variant="plain"
                              >
                                View Product
                              </Button>
                            </InlineStack>
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

        {/* Recent Orders */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Recent DIY Label Orders
                  </Text>
                  <Button variant="plain" url="/app/orders">
                    View all orders
                  </Button>
                </InlineStack>
                
                {recentOrders.length === 0 ? (
                  <EmptyState
                    heading="No DIY Label orders yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>When customers choose local printing, their orders will appear here.</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text']}
                    headings={['Order ID', 'Print Shop', 'Status', 'Date']}
                    rows={orderRows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}