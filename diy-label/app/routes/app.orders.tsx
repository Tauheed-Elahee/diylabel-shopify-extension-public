import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  DataTable,
  EmptyState,
  Filters,
  Button,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get store
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('id')
    .eq('shop_domain', session.shop)
    .single();

  if (!store) {
    throw new Error('Store not found');
  }

  // Get all DIY Label orders with print shop details
  const { data: orders } = await supabaseAdmin
    .from('diy_label_orders')
    .select(`
      *,
      print_shops (
        name,
        address,
        phone,
        email
      )
    `)
    .eq('shopify_store_id', store.id)
    .order('created_at', { ascending: false });

  return json({
    orders: orders || []
  });
};

export default function Orders() {
  const { orders } = useLoaderData<typeof loader>();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [queryValue, setQueryValue] = useState('');

  const handleStatusFilterChange = (value: string[]) => setStatusFilter(value);
  const handleQueryValueChange = (value: string) => setQueryValue(value);
  const handleFiltersClearAll = () => {
    setStatusFilter([]);
    setQueryValue('');
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);
    const matchesQuery = queryValue === '' || 
      order.shopify_order_id.toLowerCase().includes(queryValue.toLowerCase()) ||
      order.print_shops?.name.toLowerCase().includes(queryValue.toLowerCase());
    
    return matchesStatus && matchesQuery;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { status: 'info' as const, label: 'Pending' },
      confirmed: { status: 'attention' as const, label: 'Confirmed' },
      printing: { status: 'attention' as const, label: 'Printing' },
      ready: { status: 'warning' as const, label: 'Ready for Pickup' },
      completed: { status: 'success' as const, label: 'Completed' },
      cancelled: { status: 'critical' as const, label: 'Cancelled' }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge status={config.status}>{config.label}</Badge>;
  };

  const orderRows = filteredOrders.map(order => [
    order.shopify_order_id,
    order.product_data?.title || 'Unknown Product',
    order.customer_data?.name || 'Unknown Customer',
    order.print_shops?.name || 'Unassigned',
    getStatusBadge(order.status),
    order.product_data?.total ? formatCurrency(order.product_data.total) : '-',
    formatDate(order.created_at)
  ]);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <Filters
          queryValue={queryValue}
          filters={[
            {
              key: 'status',
              label: 'Status',
              filter: (
                <div>Status filter placeholder</div>
              )
            }
          ]}
          onQueryChange={handleQueryValueChange}
          onQueryClear={() => setQueryValue('')}
          onClearAll={handleFiltersClearAll}
        />
      )
    }
  ];

  return (
    <Page>
      <TitleBar title="DIY Label Orders" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  All DIY Label Orders
                </Text>
                <Text as="p" variant="bodyMd" color="subdued">
                  {filteredOrders.length} of {orders.length} orders
                </Text>
              </InlineStack>

              {orders.length === 0 ? (
                <EmptyState
                  heading="No DIY Label orders yet"
                  action={{
                    content: 'View products',
                    url: '/app'
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>When customers choose local printing for your products, their orders will appear here.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  <Filters
                    queryValue={queryValue}
                    filters={[]}
                    onQueryChange={handleQueryValueChange}
                    onQueryClear={() => setQueryValue('')}
                    onClearAll={handleFiltersClearAll}
                  />
                  
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={[
                      'Order ID',
                      'Product',
                      'Customer',
                      'Print Shop',
                      'Status',
                      'Total',
                      'Date'
                    ]}
                    rows={orderRows}
                    sortable={[false, true, true, true, false, true, true]}
                  />
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}