import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Check which tables exist
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['print_shops', 'shopify_stores', 'diy_label_orders', 'product_settings']);

    if (tablesError) {
      return json({ 
        success: false, 
        error: `Failed to check tables: ${tablesError.message}`,
        tables: []
      });
    }

    const existingTables = tables?.map(t => t.table_name) || [];

    // Check print_shops schema if it exists
    let printShopsSchema = null;
    if (existingTables.includes('print_shops')) {
      const { data: columns, error: columnsError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'print_shops')
        .order('ordinal_position');

      if (!columnsError) {
        printShopsSchema = columns;
      }
    }

    // Check if we can query print_shops
    let printShopsData = null;
    let printShopsError = null;
    if (existingTables.includes('print_shops')) {
      try {
        const { data, error } = await supabaseAdmin
          .from('print_shops')
          .select('*')
          .limit(1);
        
        printShopsData = data;
        printShopsError = error?.message;
      } catch (err) {
        printShopsError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    return json({
      success: true,
      existingTables,
      requiredTables: ['print_shops', 'shopify_stores', 'diy_label_orders', 'product_settings'],
      missingTables: ['print_shops', 'shopify_stores', 'diy_label_orders', 'product_settings'].filter(
        table => !existingTables.includes(table)
      ),
      printShopsSchema,
      printShopsData,
      printShopsError
    });

  } catch (error) {
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      tables: []
    });
  }
};

export default function DiagnoseDB() {
  const result = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>Database Schema Diagnosis</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Table Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {['print_shops', 'shopify_stores', 'diy_label_orders', 'product_settings'].map(table => (
            <div 
              key={table}
              style={{ 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                backgroundColor: result.existingTables?.includes(table) ? '#e8f5e8' : '#fee8e8'
              }}
            >
              <strong>{table}</strong>
              <br />
              {result.existingTables?.includes(table) ? '✅ EXISTS' : '❌ MISSING'}
            </div>
          ))}
        </div>
      </div>

      {result.printShopsSchema && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Current print_shops Schema</h2>
          <table style={{ border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Column</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Type</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Nullable</th>
              </tr>
            </thead>
            <tbody>
              {result.printShopsSchema.map((col: any) => (
                <tr key={col.column_name}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.column_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.data_type}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.is_nullable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.printShopsData && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Sample print_shops Data</h2>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(result.printShopsData, null, 2)}
          </pre>
        </div>
      )}

      {result.printShopsError && (
        <div style={{ marginBottom: '30px', padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc' }}>
          <h3>Print Shops Query Error:</h3>
          <p>{result.printShopsError}</p>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>Required Actions</h2>
        {result.missingTables && result.missingTables.length > 0 ? (
          <div>
            <p><strong>Missing Tables:</strong> {result.missingTables.join(', ')}</p>
            <p>You need to create these tables. Here are your options:</p>
            <ol>
              <li><strong>Full Migration (Recommended):</strong> Run the complete migration in Supabase SQL Editor</li>
              <li><strong>Individual Tables:</strong> Create only the missing tables</li>
            </ol>
          </div>
        ) : (
          <p style={{ color: 'green' }}>✅ All required tables exist!</p>
        )}
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #cce' }}>
        <h3>Next Steps:</h3>
        {result.missingTables?.includes('shopify_stores') && (
          <div>
            <p><strong>Missing shopify_stores table</strong> - This is critical for the Shopify app to work.</p>
            <p>Go to your Supabase SQL Editor and run this SQL:</p>
            <pre style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', overflow: 'auto' }}>
{`-- Create shopify_stores table
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

-- Enable RLS
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Allow service role to insert stores
CREATE POLICY "Service role can insert stores"
  ON shopify_stores
  FOR INSERT
  TO service_role
  WITH CHECK (true);`}
            </pre>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Full Diagnostic Data:</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}