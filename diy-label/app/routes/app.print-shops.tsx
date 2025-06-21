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

  try {
    // Get all print shops (using your existing schema)
    const { data: printShops, error } = await supabaseAdmin
      .from('print_shops')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return json({
      printShops: printShops || []
    });
  } catch (error) {
    console.error('Error loading print shops:', error);
    throw new Error(`Failed to load print shops: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default function PrintShops() {
  const { printShops } = useLoaderData<typeof loader>();

  const formatCapabilities = (shop: any) => {
    // Handle both new capabilities format and old specialty format
    if (shop.capabilities && typeof shop.capabilities === 'object') {
      const caps = [];
      if (shop.capabilities.screen_printing) caps.push('Screen Printing');
      if (shop.capabilities.embroidery) caps.push('Embroidery');
      if (shop.capabilities.dtg) caps.push('DTG');
      if (shop.capabilities.reused_apparel) caps.push('Reused Apparel');
      if (shop.capabilities.organic_inks) caps.push('Organic Inks');
      if (shop.capabilities.water_based_inks) caps.push('Water-based Inks');
      
      return caps.length > 0 ? caps.join(', ') : (shop.specialty || 'General Printing');
    }
    
    // Fallback to specialty if capabilities not available
    return shop.specialty || 'General Printing';
  };

  const formatHours = (shop: any) => {
    // Handle new hours format
    if (shop.hours && typeof shop.hours === 'object') {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const todayHours = shop.hours[today];
      
      if (todayHours) {
        return `Today: ${todayHours}`;
      }
      
      return 'Hours available';
    }
    
    // Fallback for shops without hours data
    return 'Contact for hours';
  };

  const formatRating = (rating: number) => {
    if (!rating) return 'No rating';
    return `⭐ ${rating.toFixed(1)}/5.0`;
  };

  const formatContact = (shop: any) => {
    const contact = [];
    
    if (shop.phone) {
      contact.push(`📞 ${shop.phone}`);
    }
    
    if (shop.email) {
      contact.push(`✉️ ${shop.email}`);
    }
    
    if (shop.website) {
      contact.push(`🌐 Website`);
    }
    
    return contact.length > 0 ? contact : ['Contact info not available'];
  };

  const printShopRows = printShops.map(shop => [
    <BlockStack gap="100" key={shop.id}>
      <Text as="span" variant="bodyMd" fontWeight="semibold">
        {shop.name}
      </Text>
      <Text as="span" variant="bodySm" color="subdued">
        {shop.address}
      </Text>
      {shop.rating && (
        <Text as="span" variant="bodySm">
          {formatRating(shop.rating)}
        </Text>
      )}
    </BlockStack>,
    
    <BlockStack gap="100" key={`contact-${shop.id}`}>
      {formatContact(shop).map((contact, index) => (
        <Text as="span" variant="bodySm" key={index}>
          {contact.includes('Website') && shop.website ? (
            <a href={shop.website} target="_blank" rel="noopener noreferrer">
              {contact}
            </a>
          ) : (
            contact
          )}
        </Text>
      ))}
    </BlockStack>,
    
    <Text as="span" variant="bodySm" key={`caps-${shop.id}`}>
      {formatCapabilities(shop)}
    </Text>,
    
    <Text as="span" variant="bodySm" key={`hours-${shop.id}`}>
      {formatHours(shop)}
    </Text>,
    
    <Badge status={shop.active !== false ? "success" : "critical"} key={`status-${shop.id}`}>
      {shop.active !== false ? 'Active' : 'Inactive'}
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
                  {printShops.length} print shops available
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