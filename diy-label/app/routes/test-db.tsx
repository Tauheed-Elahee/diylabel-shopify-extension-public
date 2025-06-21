import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { supabaseAdmin } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('print_shops')
      .select('count')
      .limit(1);

    if (error) {
      return json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }

    return json({ 
      success: true, 
      message: "Database connection successful",
      data 
    });
  } catch (error) {
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    });
  }
};

export default function TestDB() {
  const result = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Database Connection Test</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre>
      
      {!result.success && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc' }}>
          <h3>Error Details:</h3>
          <p>This error suggests the database tables don't exist yet.</p>
          <p>You need to run the migration in your Supabase dashboard:</p>
          <ol>
            <li>Go to your Supabase project dashboard</li>
            <li>Open the SQL Editor</li>
            <li>Copy and paste the contents of: <code>supabase/migrations/20250621101901_winter_morning.sql</code></li>
            <li>Run the SQL to create the tables</li>
          </ol>
        </div>
      )}
    </div>
  );
}