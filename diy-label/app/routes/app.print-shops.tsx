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
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Get all active print shops
  const { data: printShops } = await supabaseAdmin
    .from('print_shops')
    .select('*')
    .eq('active', true)
    .order('name');

  return json({
    printShops: printShops || []
  });
};

export default function PrintShops() {
  const { printShops } = useLoaderData<typeof loader>();

  const formatCapabilities = (capabilities: any) => {
    const caps = [];
    if (capabilities.screen_printing) caps.push('Screen Printing');
    if (capabilities.embroidery) caps.push('Embroidery');
    if (capabilities.dtg) caps.push('DTG');
    if (capabilities.reused_apparel) caps.push('Reused Apparel');
    if (capabilities.organic_inks) caps.push('Organic Inks');
    if (capabilities.water_based_inks) caps.push('Water-based Inks');
    
    return caps.join(', ') || 'None listed';
  };

  const formatHours = (hours: any) => {
    if (!hours || typeof hours !== 'object') return 'Hours not available';
    
    const today = new Date().toLocaleLowerCase().slice(0, 3);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayHours = hours[today] || hours[`${today}day`];
    
    if (todayHours) {
      return `Today: ${todayHours}`;
    }
    
    return 'Hours available';
  };

  const printShopRows = printShops.map(shop => [
    <BlockStack gap="100" key={shop.id}>
      <Text as="span" variant="bodyMd" fontWeight="semibold">
        {shop.name}
      </Text>
      <Text as="span" variant="bodySm" color="subdued">
        {shop.address}
      </Text>
    </BlockStack>,
    <BlockStack gap="100" key={`contact-${shop.id}`}>
      {shop.phone && (
        <Text as="span" variant="bodySm">
          📞 {shop.phone}
        </Text>
      )}
      {shop.email && (
        <Text as="span" variant="bodySm">
          ✉️ {shop.email}
        </Text>
      )}
      {shop.website && (
        <Text as="span" variant="bodySm">
          🌐 <a href={shop.website} target="_blank" rel="noopener noreferrer">Website</a>
        </Text>
      )}
    </BlockStack>,
    <Text as="span" variant="bodySm" key={`caps-${shop.id}`}>
      {formatCapabilities(shop.capabilities)}
    </Text>,
    <Text as="span" variant="bodySm" key={`hours-${shop.id}`}>
      {formatHours(shop.hours)}
    </Text>,
    <Badge status="success" key={`status-${shop.id}`}>
      Active
    </Badge>
  ]);

  return (
    <Page>
      <TitleBar title="Partner Print Shops" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Print Shop Network
                </Text>
                <Text as="p" variant="bodyMd" color="subdued">
                  {printShops.length} active partners
                </Text>
              </InlineStack>

              {printShops.length === 0 ? (
                <EmptyState
                  heading="No print shops available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Print shop partners will appear here once they join the DIY Label network.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={[
                    'Shop Details',
                    'Contact Info',
                    'Capabilities',
                    'Hours',
                    'Status'
                  ]}
                  rows={printShopRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}