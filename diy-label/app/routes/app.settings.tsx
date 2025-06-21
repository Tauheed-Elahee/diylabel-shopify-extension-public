import { useState, useEffect } from "react";
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
  TextField,
  Checkbox,
  Select,
  FormLayout,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get store settings
  const { data: store } = await supabaseAdmin
    .from('shopify_stores')
    .select('*')
    .eq('shop_domain', session.shop)
    .single();

  if (!store) {
    throw new Error('Store not found');
  }

  return json({
    store,
    settings: store.settings || {}
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    default_radius: parseInt(formData.get('default_radius') as string) || 25,
    auto_assign_closest: formData.get('auto_assign_closest') === 'on',
    require_customer_approval: formData.get('require_customer_approval') === 'on',
    enable_reused_apparel: formData.get('enable_reused_apparel') === 'on',
    notification_email: formData.get('notification_email') as string || '',
    widget_theme: formData.get('widget_theme') as string || 'light',
    show_print_shop_details: formData.get('show_print_shop_details') === 'on',
    enable_order_tracking: formData.get('enable_order_tracking') === 'on'
  };

  // Update store settings
  const { error } = await supabaseAdmin
    .from('shopify_stores')
    .update({ 
      settings,
      updated_at: new Date().toISOString()
    })
    .eq('shop_domain', session.shop);

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }

  return json({ success: true, settings });
};

export default function Settings() {
  const { store, settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formSettings, setFormSettings] = useState({
    default_radius: settings.default_radius || 25,
    auto_assign_closest: settings.auto_assign_closest || false,
    require_customer_approval: settings.require_customer_approval || true,
    enable_reused_apparel: settings.enable_reused_apparel || true,
    notification_email: settings.notification_email || '',
    widget_theme: settings.widget_theme || 'light',
    show_print_shop_details: settings.show_print_shop_details || true,
    enable_order_tracking: settings.enable_order_tracking || true
  });

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully");
    }
  }, [fetcher.data, shopify]);

  const handleSubmit = () => {
    const formData = new FormData();
    Object.entries(formSettings).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    
    fetcher.submit(formData, { method: 'POST' });
  };

  const radiusOptions = [
    { label: '10 miles', value: '10' },
    { label: '25 miles', value: '25' },
    { label: '50 miles', value: '50' },
    { label: '100 miles', value: '100' }
  ];

  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Auto', value: 'auto' }
  ];

  return (
    <Page>
      <TitleBar title="DIY Label Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                General Settings
              </Text>
              
              <FormLayout>
                <Select
                  label="Default search radius"
                  options={radiusOptions}
                  value={formSettings.default_radius.toString()}
                  onChange={(value) => setFormSettings(prev => ({ 
                    ...prev, 
                    default_radius: parseInt(value) 
                  }))}
                  helpText="How far customers can search for print shops by default"
                />

                <TextField
                  label="Notification email"
                  type="email"
                  value={formSettings.notification_email}
                  onChange={(value) => setFormSettings(prev => ({ 
                    ...prev, 
                    notification_email: value 
                  }))}
                  helpText="Email address to receive DIY Label order notifications"
                  placeholder="orders@yourstore.com"
                />

                <Checkbox
                  label="Auto-assign closest print shop"
                  checked={formSettings.auto_assign_closest}
                  onChange={(checked) => setFormSettings(prev => ({ 
                    ...prev, 
                    auto_assign_closest: checked 
                  }))}
                  helpText="Automatically assign orders to the closest available print shop"
                />

                <Checkbox
                  label="Require customer approval for print shop assignment"
                  checked={formSettings.require_customer_approval}
                  onChange={(checked) => setFormSettings(prev => ({ 
                    ...prev, 
                    require_customer_approval: checked 
                  }))}
                  helpText="Let customers choose their preferred print shop"
                />
              </FormLayout>

              <Divider />

              <Text as="h3" variant="headingSm">
                Sustainability Options
              </Text>

              <FormLayout>
                <Checkbox
                  label="Enable reused apparel options"
                  checked={formSettings.enable_reused_apparel}
                  onChange={(checked) => setFormSettings(prev => ({ 
                    ...prev, 
                    enable_reused_apparel: checked 
                  }))}
                  helpText="Allow customers to choose printing on reused/recycled apparel"
                />
              </FormLayout>

              <Divider />

              <Text as="h3" variant="headingSm">
                Customer Widget Settings
              </Text>

              <FormLayout>
                <Select
                  label="Widget theme"
                  options={themeOptions}
                  value={formSettings.widget_theme}
                  onChange={(value) => setFormSettings(prev => ({ 
                    ...prev, 
                    widget_theme: value 
                  }))}
                  helpText="Theme for the customer-facing print shop widget"
                />

                <Checkbox
                  label="Show print shop details"
                  checked={formSettings.show_print_shop_details}
                  onChange={(checked) => setFormSettings(prev => ({ 
                    ...prev, 
                    show_print_shop_details: checked 
                  }))}
                  helpText="Display print shop contact info and capabilities to customers"
                />

                <Checkbox
                  label="Enable order tracking"
                  checked={formSettings.enable_order_tracking}
                  onChange={(checked) => setFormSettings(prev => ({ 
                    ...prev, 
                    enable_order_tracking: checked 
                  }))}
                  helpText="Allow customers to track their DIY Label orders"
                />
              </FormLayout>

              <InlineStack align="end">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={fetcher.state === 'submitting'}
                >
                  Save Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Store Information
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">
                  <strong>Shop Domain:</strong> {store.shop_domain}
                </Text>
                <Text as="p" variant="bodySm">
                  <strong>Connected:</strong> {new Date(store.created_at).toLocaleDateString()}
                </Text>
                <Text as="p" variant="bodySm">
                  <strong>Status:</strong> {store.active ? 'Active' : 'Inactive'}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Need Help?
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">
                  Check out our documentation for setup guides and troubleshooting.
                </Text>
                <Button variant="plain" url="https://diylabel.netlify.app" target="_blank">
                  View Documentation
                </Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}