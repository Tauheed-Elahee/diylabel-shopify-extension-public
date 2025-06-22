import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // First, let's try a direct query to see what tables exist
    const { data: directTables, error: directError } = await supabaseAdmin
      .rpc('exec_sql', { 
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });

    // Alternative approach: try to query each table directly
    const tableChecks = await Promise.allSettled([
      supabaseAdmin.from('print_shops').select('count').limit(1),
      supabaseAdmin.from('shopify_stores').select('count').limit(1),
      supabaseAdmin.from('diy_label_orders').select('count').limit(1),
      supabaseAdmin.from('product_settings').select('count').limit(1)
    ]);

    const existingTables = [];
    const tableNames = ['print_shops', 'shopify_stores', 'diy_label_orders', 'product_settings'];
    
    tableChecks.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        existingTables.push(tableNames[index]);
      }
    });

    // Get detailed schema for print_shops if it exists
    let printShopsSchema = null;
    let printShopsData = null;
    let printShopsError = null;

    if (existingTables.includes('print_shops')) {
      try {
        // Get schema information
        const { data: schemaData } = await supabaseAdmin
          .rpc('exec_sql', {
            sql: `
              SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'print_shops'
              ORDER BY ordinal_position;
            `
          });
        
        printShopsSchema = schemaData;

        // Get sample data
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

    // Check if we can access the function
    let functionExists = false;
    try {
      const { data: functionData } = await supabaseAdmin
        .rpc('get_nearby_print_shops', {
          user_lat: 37.7749,
          user_lng: -122.4194,
          radius_km: 1
        });
      functionExists = true;
    } catch (err) {
      functionExists = false;
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
      printShopsError,
      functionExists,
      directTables: directTables || [],
      directError: directError?.message,
      tableCheckResults: tableChecks.map((result, index) => ({
        table: tableNames[index],
        status: result.status,
        error: result.status === 'rejected' ? result.reason?.message : 
               result.value.error?.message || null
      }))
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

      <div style={{ marginBottom: '30px' }}>
        <h2>Function Status</h2>
        <div style={{ 
          padding: '10px', 
          border: '1px solid #ccc', 
          borderRadius: '4px',
          backgroundColor: result.functionExists ? '#e8f5e8' : '#fee8e8'
        }}>
          <strong>get_nearby_print_shops function</strong>
          <br />
          {result.functionExists ? '✅ EXISTS AND WORKING' : '❌ NOT WORKING'}
        </div>
      </div>

      {result.tableCheckResults && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Direct Table Check Results</h2>
          <table style={{ border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Table</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {result.tableCheckResults.map((check: any) => (
                <tr key={check.table}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{check.table}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{check.status}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{check.error || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.printShopsSchema && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Current print_shops Schema</h2>
          <table style={{ border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Column</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Type</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Nullable</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Default</th>
              </tr>
            </thead>
            <tbody>
              {result.printShopsSchema.map((col: any) => (
                <tr key={col.column_name}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.column_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.data_type}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.is_nullable}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{col.column_default || 'None'}</td>
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
            <p>The latest migration should have created these tables. Let's check if the migration ran successfully.</p>
            
            <div style={{ padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #cce', marginTop: '15px' }}>
              <h3>Troubleshooting Steps:</h3>
              <ol>
                <li><strong>Check Supabase Migration History:</strong> Go to your Supabase dashboard → Database → Migrations to see if the latest migration ran</li>
                <li><strong>Manual Table Creation:</strong> If migrations aren't working, you can create tables manually in the SQL Editor</li>
                <li><strong>Check Permissions:</strong> Ensure your service role key has the correct permissions</li>
              </ol>
            </div>
          </div>
        ) : (
          <p style={{ color: 'green' }}>✅ All required tables exist!</p>
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