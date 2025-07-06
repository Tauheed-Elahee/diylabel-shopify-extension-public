/*
  # DIY Label Shopify Extension - Missing Tables Migration

  This migration creates the missing tables needed for the Shopify extension
  and updates the existing print_shops table to be compatible.

  1. Update existing print_shops table
    - Add missing columns: latitude, longitude, phone, email, website, capabilities, hours, active
    - Keep existing columns: id, name, address, lat, lng, specialty, rating
    - Add indexes for new columns

  2. New Tables
    - `shopify_stores` - Store credentials and settings
    - `diy_label_orders` - Order tracking
    - `product_settings` - Product-specific DIY Label settings

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- First, add missing columns to existing print_shops table
DO $$
BEGIN
  -- Add latitude column (copy from lat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN latitude decimal(10, 8);
    UPDATE print_shops SET latitude = lat WHERE latitude IS NULL;
    ALTER TABLE print_shops ALTER COLUMN latitude SET NOT NULL;
  END IF;

  -- Add longitude column (copy from lng)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN longitude decimal(11, 8);
    UPDATE print_shops SET longitude = lng WHERE longitude IS NULL;
    ALTER TABLE print_shops ALTER COLUMN longitude SET NOT NULL;
  END IF;

  -- Add phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'phone'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN phone text;
  END IF;

  -- Add email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'email'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN email text;
  END IF;

  -- Add website column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'website'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN website text;
  END IF;

  -- Add capabilities column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'capabilities'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN capabilities jsonb DEFAULT '{}';
  END IF;

  -- Add hours column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'hours'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN hours jsonb DEFAULT '{}';
  END IF;

  -- Add active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'active'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- Update capabilities based on specialty (if empty)
UPDATE print_shops 
SET capabilities = jsonb_build_object(
  'screen_printing', true,
  'embroidery', specialty ILIKE '%embroidery%',
  'dtg', specialty ILIKE '%dtg%' OR specialty ILIKE '%digital%',
  'reused_apparel', specialty ILIKE '%eco%' OR specialty ILIKE '%sustainable%' OR specialty ILIKE '%reused%'
)
WHERE capabilities = '{}' OR capabilities IS NULL;

-- Set default hours for shops that don't have them
UPDATE print_shops 
SET hours = jsonb_build_object(
  'monday', '9:00-17:00',
  'tuesday', '9:00-17:00', 
  'wednesday', '9:00-17:00',
  'thursday', '9:00-17:00',
  'friday', '9:00-17:00',
  'saturday', '10:00-15:00',
  'sunday', 'closed'
)
WHERE hours = '{}' OR hours IS NULL;

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
  print_shop_id bigint REFERENCES print_shops(id) ON DELETE SET NULL,
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

-- Enable Row Level Security on new tables
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE diy_label_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for shopify_stores
CREATE POLICY "Service role can manage stores"
  ON shopify_stores
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Store owners can read their own store"
  ON shopify_stores
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'shop_domain' = shop_domain);

CREATE POLICY "Store owners can update their own store"
  ON shopify_stores
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'shop_domain' = shop_domain);

-- Create policies for diy_label_orders
CREATE POLICY "Service role can manage orders"
  ON diy_label_orders
  FOR ALL
  TO service_role
  USING (true);

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
CREATE POLICY "Service role can manage product settings"
  ON product_settings
  FOR ALL
  TO service_role
  USING (true);

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

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_print_shops_latitude_longitude ON print_shops (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_print_shops_active ON print_shops (active);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores (shop_domain);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_store ON diy_label_orders (shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_status ON diy_label_orders (status);
CREATE INDEX IF NOT EXISTS idx_product_settings_store_product ON product_settings (shopify_store_id, shopify_product_id);