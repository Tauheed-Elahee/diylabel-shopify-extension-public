/*
  # Add Shopify Tables Without Touching Existing Function
  
  This migration adds only the missing Shopify-related tables without
  modifying the existing get_nearby_print_shops function that's used
  by the landing page.
  
  1. Creates shopify_stores table
  2. Creates diy_label_orders table  
  3. Creates product_settings table
  4. Sets up Row Level Security
  5. Creates necessary indexes
  6. Does NOT touch the existing print_shops table or function
*/

-- Create shopify_stores table
CREATE TABLE IF NOT EXISTS shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text UNIQUE NOT NULL,
  access_token text NOT NULL,
  scope text,
  settings jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create diy_label_orders table
CREATE TABLE IF NOT EXISTS diy_label_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL,
  shopify_store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE,
  print_shop_id bigint, -- Reference to existing print_shops.id
  product_data jsonb DEFAULT '{}',
  customer_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  tracking_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_settings table
CREATE TABLE IF NOT EXISTS product_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE,
  shopify_product_id text NOT NULL,
  diy_label_enabled boolean DEFAULT false,
  allow_reused_apparel boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shopify_store_id, shopify_product_id)
);

-- Enable Row Level Security on new tables only
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE diy_label_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for shopify_stores
DROP POLICY IF EXISTS "Service role can manage stores" ON shopify_stores;
CREATE POLICY "Service role can manage stores"
  ON shopify_stores
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Store owners can read their own store" ON shopify_stores;
CREATE POLICY "Store owners can read their own store"
  ON shopify_stores
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'shop_domain' = shop_domain);

DROP POLICY IF EXISTS "Store owners can update their own store" ON shopify_stores;
CREATE POLICY "Store owners can update their own store"
  ON shopify_stores
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'shop_domain' = shop_domain);

-- Create policies for diy_label_orders
DROP POLICY IF EXISTS "Service role can manage orders" ON diy_label_orders;
CREATE POLICY "Service role can manage orders"
  ON diy_label_orders
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Store owners can read their own orders" ON diy_label_orders;
CREATE POLICY "Store owners can read their own orders"
  ON diy_label_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_stores 
      WHERE shopify_stores.id = diy_label_orders.shopify_store_id 
      AND shopify_stores.shop_domain = auth.jwt() ->> 'shop_domain'
    )
  );

-- Create policies for product_settings
DROP POLICY IF EXISTS "Service role can manage product settings" ON product_settings;
CREATE POLICY "Service role can manage product settings"
  ON product_settings
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Store owners can manage their product settings" ON product_settings;
CREATE POLICY "Store owners can manage their product settings"
  ON product_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_stores 
      WHERE shopify_stores.id = product_settings.shopify_store_id 
      AND shopify_stores.shop_domain = auth.jwt() ->> 'shop_domain'
    )
  );

-- Create indexes for performance on new tables only
CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores (shop_domain);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_store ON diy_label_orders (shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_print_shop ON diy_label_orders (print_shop_id);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_status ON diy_label_orders (status);
CREATE INDEX IF NOT EXISTS idx_product_settings_store_product ON product_settings (shopify_store_id, shopify_product_id);

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for new tables
DROP TRIGGER IF EXISTS update_shopify_stores_updated_at ON shopify_stores;
CREATE TRIGGER update_shopify_stores_updated_at
  BEFORE UPDATE ON shopify_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diy_label_orders_updated_at ON diy_label_orders;
CREATE TRIGGER update_diy_label_orders_updated_at
  BEFORE UPDATE ON diy_label_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_settings_updated_at ON product_settings;
CREATE TRIGGER update_product_settings_updated_at
  BEFORE UPDATE ON product_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();