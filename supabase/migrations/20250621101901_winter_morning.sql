/*
  # DIY Label Database Schema

  1. New Tables
    - `print_shops`
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `phone` (text)
      - `email` (text)
      - `website` (text)
      - `capabilities` (jsonb)
      - `hours` (jsonb)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `shopify_stores`
      - `id` (uuid, primary key)
      - `shop_domain` (text, unique)
      - `access_token` (text)
      - `scope` (text)
      - `settings` (jsonb)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `diy_label_orders`
      - `id` (uuid, primary key)
      - `shopify_order_id` (text)
      - `shopify_store_id` (uuid, foreign key)
      - `print_shop_id` (uuid, foreign key)
      - `product_data` (jsonb)
      - `customer_data` (jsonb)
      - `status` (text)
      - `tracking_info` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `product_settings`
      - `id` (uuid, primary key)
      - `shopify_store_id` (uuid, foreign key)
      - `shopify_product_id` (text)
      - `diy_label_enabled` (boolean)
      - `allow_reused_apparel` (boolean)
      - `settings` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for store-specific access
    - Add policies for public print shop access

  3. Indexes
    - Geographic index for print shop location queries
    - Indexes for common query patterns
*/

-- Create print_shops table
CREATE TABLE IF NOT EXISTS print_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  phone text,
  email text,
  website text,
  capabilities jsonb DEFAULT '{}',
  hours jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  print_shop_id uuid REFERENCES print_shops(id) ON DELETE SET NULL,
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

-- Enable Row Level Security
ALTER TABLE print_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE diy_label_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for print_shops (public read access)
CREATE POLICY "Print shops are publicly readable"
  ON print_shops
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Create policies for shopify_stores (store owners only)
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

-- Create policies for diy_label_orders (store owners only)
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

CREATE POLICY "Store owners can insert their own orders"
  ON diy_label_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopify_stores 
      WHERE shopify_stores.id = diy_label_orders.shopify_store_id 
      AND shopify_stores.shop_domain = auth.jwt() ->> 'shop_domain'
    )
  );

-- Create policies for product_settings (store owners only)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_print_shops_location ON print_shops USING GIST (
  point(longitude, latitude)
);

CREATE INDEX IF NOT EXISTS idx_print_shops_active ON print_shops (active);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores (shop_domain);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_store ON diy_label_orders (shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_status ON diy_label_orders (status);
CREATE INDEX IF NOT EXISTS idx_product_settings_store_product ON product_settings (shopify_store_id, shopify_product_id);

-- Insert sample print shops
INSERT INTO print_shops (name, address, latitude, longitude, phone, email, capabilities, hours) VALUES
('Local Print Co.', '123 Main St, San Francisco, CA 94102', 37.7749, -122.4194, '(415) 555-0123', 'hello@localprintco.com', 
 '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": true}',
 '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00", "saturday": "10:00-15:00", "sunday": "closed"}'),

('Eco Print Studio', '456 Green Ave, Portland, OR 97201', 45.5152, -122.6784, '(503) 555-0456', 'info@ecoprintstudio.com',
 '{"screen_printing": true, "embroidery": false, "dtg": true, "reused_apparel": true, "organic_inks": true}',
 '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "9:00-16:00", "sunday": "closed"}'),

('Urban Threads', '789 Brooklyn Blvd, Brooklyn, NY 11201', 40.6892, -73.9442, '(718) 555-0789', 'orders@urbanthreads.com',
 '{"screen_printing": true, "embroidery": true, "dtg": false, "reused_apparel": false}',
 '{"monday": "10:00-19:00", "tuesday": "10:00-19:00", "wednesday": "10:00-19:00", "thursday": "10:00-19:00", "friday": "10:00-19:00", "saturday": "11:00-17:00", "sunday": "12:00-16:00"}'),

('Sustainable Prints', '321 Austin St, Austin, TX 78701', 30.2672, -97.7431, '(512) 555-0321', 'hello@sustainableprints.com',
 '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": true, "organic_inks": true, "water_based_inks": true}',
 '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00", "saturday": "closed", "sunday": "closed"}');