/*
  # Fix get_nearby_print_shops function signature
  
  This migration fixes the function signature conflict by:
  1. Dropping the existing function
  2. Recreating it with the correct signature
  3. Ensuring all tables exist with proper structure
*/

-- Drop the existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS get_nearby_print_shops(double precision, double precision, double precision);

-- Ensure print_shops table exists with correct structure
CREATE TABLE IF NOT EXISTS print_shops (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text NOT NULL,
  specialty text NOT NULL,
  rating numeric(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  phone text,
  email text,
  website text,
  capabilities jsonb DEFAULT '{}',
  hours jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add compatibility columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN latitude decimal(10, 8);
    UPDATE print_shops SET latitude = lat WHERE latitude IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_shops' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE print_shops ADD COLUMN longitude decimal(11, 8);
    UPDATE print_shops SET longitude = lng WHERE longitude IS NULL;
  END IF;
END $$;

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

-- Enable Row Level Security
ALTER TABLE print_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE diy_label_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Print shops are publicly readable" ON print_shops;
CREATE POLICY "Print shops are publicly readable"
  ON print_shops
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_print_shops_location ON print_shops (lat, lng);
CREATE INDEX IF NOT EXISTS idx_print_shops_latitude_longitude ON print_shops (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_print_shops_active ON print_shops (active);
CREATE INDEX IF NOT EXISTS idx_print_shops_name ON print_shops USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_print_shops_specialty ON print_shops USING gin(to_tsvector('english', specialty));
CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores (shop_domain);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_store ON diy_label_orders (shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_diy_label_orders_status ON diy_label_orders (status);
CREATE INDEX IF NOT EXISTS idx_product_settings_store_product ON product_settings (shopify_store_id, shopify_product_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for print_shops
DROP TRIGGER IF EXISTS update_print_shops_updated_at ON print_shops;
CREATE TRIGGER update_print_shops_updated_at
  BEFORE UPDATE ON print_shops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate the function with correct signature
CREATE OR REPLACE FUNCTION get_nearby_print_shops(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  name text,
  lat double precision,
  lng double precision,
  address text,
  specialty text,
  rating numeric,
  phone text,
  email text,
  website text,
  capabilities jsonb,
  hours jsonb,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km double precision
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ps.id,
    ps.name,
    ps.lat,
    ps.lng,
    ps.address,
    ps.specialty,
    ps.rating,
    ps.phone,
    ps.email,
    ps.website,
    ps.capabilities,
    ps.hours,
    ps.active,
    ps.created_at,
    ps.updated_at,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(ps.lat)) * 
        cos(radians(ps.lng) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(ps.lat))
      )
    ) AS distance_km
  FROM print_shops ps
  WHERE ps.active = true
  AND (
    6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(ps.lat)) * 
      cos(radians(ps.lng) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(ps.lat))
    )
  ) <= radius_km
  ORDER BY distance_km;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_nearby_print_shops TO public;

-- Insert sample print shops data (only if table is empty)
INSERT INTO print_shops (name, lat, lng, address, specialty, rating, phone, email, website, capabilities, hours) 
SELECT * FROM (VALUES
  ('Local Print Co.', 37.7749, -122.4194, '123 Main St, San Francisco, CA 94102', 'Screen Printing & Embroidery', 4.5, '(415) 555-0123', 'hello@localprintco.com', 'https://localprintco.com', 
   '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": true}',
   '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00", "saturday": "10:00-15:00", "sunday": "closed"}'),

  ('Eco Print Studio', 45.5152, -122.6784, '456 Green Ave, Portland, OR 97201', 'Sustainable Printing', 4.8, '(503) 555-0456', 'info@ecoprintstudio.com', 'https://ecoprintstudio.com',
   '{"screen_printing": true, "embroidery": false, "dtg": true, "reused_apparel": true, "organic_inks": true}',
   '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "9:00-16:00", "sunday": "closed"}'),

  ('Urban Threads', 40.6892, -73.9442, '789 Brooklyn Blvd, Brooklyn, NY 11201', 'Custom Apparel', 4.2, '(718) 555-0789', 'orders@urbanthreads.com', 'https://urbanthreads.com',
   '{"screen_printing": true, "embroidery": true, "dtg": false, "reused_apparel": false}',
   '{"monday": "10:00-19:00", "tuesday": "10:00-19:00", "wednesday": "10:00-19:00", "thursday": "10:00-19:00", "friday": "10:00-19:00", "saturday": "11:00-17:00", "sunday": "12:00-16:00"}'),

  ('Sustainable Prints', 30.2672, -97.7431, '321 Austin St, Austin, TX 78701', 'Eco-Friendly Printing', 4.7, '(512) 555-0321', 'hello@sustainableprints.com', 'https://sustainableprints.com',
   '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": true, "organic_inks": true, "water_based_inks": true}',
   '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00", "saturday": "closed", "sunday": "closed"}'),

  ('Quick Print LA', 34.0522, -118.2437, '555 Hollywood Blvd, Los Angeles, CA 90028', 'Fast Turnaround Printing', 4.1, '(323) 555-0555', 'orders@quickprintla.com', 'https://quickprintla.com',
   '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": false}',
   '{"monday": "7:00-19:00", "tuesday": "7:00-19:00", "wednesday": "7:00-19:00", "thursday": "7:00-19:00", "friday": "7:00-19:00", "saturday": "9:00-17:00", "sunday": "10:00-16:00"}'),

  ('Denver Design Co.', 39.7392, -104.9903, '888 16th St, Denver, CO 80202', 'Design & Print Services', 4.6, '(303) 555-0888', 'info@denverdesignco.com', 'https://denverdesignco.com',
   '{"screen_printing": true, "embroidery": true, "dtg": true, "reused_apparel": true, "organic_inks": true}',
   '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "10:00-15:00", "sunday": "closed"}')
) AS v(name, lat, lng, address, specialty, rating, phone, email, website, capabilities, hours)
WHERE NOT EXISTS (SELECT 1 FROM print_shops LIMIT 1);

-- Update latitude/longitude for existing records
UPDATE print_shops SET latitude = lat, longitude = lng WHERE latitude IS NULL OR longitude IS NULL;