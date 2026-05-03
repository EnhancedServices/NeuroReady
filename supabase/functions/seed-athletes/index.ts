import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "enhanced.services.au@gmail.com";
const DEFAULT_PASSWORD = "Enhanced%";

const INITIAL_ATHLETES = [
  "Bodycranks@hotmail.com",
  "timbigarelli@gmail.com",
  "janefaneco@hotmail.com",
  "benclark75@hotmail.com",
  "Joelmorris85@gmail.com",
  "rowedn@yahoo.com.au",
  "mollyvoss@hotmail.com",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (callerUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Only admin can seed athletes" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingEmails = new Set(
      existingUsers?.users?.map((u) => u.email?.toLowerCase()) || []
    );

    const results: { email: string; status: string }[] = [];

    for (const email of INITIAL_ATHLETES) {
      const normalizedEmail = email.toLowerCase();

      if (existingEmails.has(normalizedEmail)) {
        results.push({ email, status: "already_exists" });
        continue;
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      if (createError) {
        results.push({ email, status: `error: ${createError.message}` });
        continue;
      }

      if (newUser?.user) {
        await adminClient
          .from("profiles")
          .upsert({
            id: newUser.user.id,
            email: normalizedEmail,
            role: "athlete",
          }, { onConflict: "id" });
      }

      results.push({ email, status: "created" });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
