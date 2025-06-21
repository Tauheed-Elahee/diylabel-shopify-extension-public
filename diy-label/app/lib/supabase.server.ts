import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface PrintShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  capabilities: {
    screen_printing?: boolean;
    embroidery?: boolean;
    dtg?: boolean;
    reused_apparel?: boolean;
    organic_inks?: boolean;
    water_based_inks?: boolean;
  };
  hours: Record<string, string>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopifyStore {
  id: string;
  shop_domain: string;
  access_token: string;
  scope?: string;
  settings: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DIYLabelOrder {
  id: string;
  shopify_order_id: string;
  shopify_store_id: string;
  print_shop_id?: string;
  product_data: Record<string, any>;
  customer_data: Record<string, any>;
  status: 'pending' | 'confirmed' | 'printing' | 'ready' | 'completed' | 'cancelled';
  tracking_info: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProductSettings {
  id: string;
  shopify_store_id: string;
  shopify_product_id: string;
  diy_label_enabled: boolean;
  allow_reused_apparel: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}