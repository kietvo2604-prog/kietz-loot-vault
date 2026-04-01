import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telco, code, serial, amount, user_id, topup_request_id } = await req.json();

    // Validate inputs
    if (!telco || !code || !serial || !amount || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GTF_PARTNER_ID = Deno.env.get("GTF_PARTNER_ID");
    const GTF_PARTNER_KEY = Deno.env.get("GTF_PARTNER_KEY");

    if (!GTF_PARTNER_ID || !GTF_PARTNER_KEY) {
      return new Response(
        JSON.stringify({ error: "API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique request_id
    const request_id = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const command = "charging";

    // Build sign: md5(partner_key + code + command + partner_id + request_id + serial + telco)
    // telco is UPPERCASE, rest is lowercase
    const telcoUpper = telco.toUpperCase();
    const signString = GTF_PARTNER_KEY + code + command + GTF_PARTNER_ID + request_id + serial + telcoUpper;
    const sign = await md5(signString);

    // Send to gachthefast.com API
    const formData = new URLSearchParams();
    formData.append("telco", telcoUpper);
    formData.append("code", code);
    formData.append("serial", serial);
    formData.append("amount", amount.toString());
    formData.append("request_id", request_id);
    formData.append("partner_id", GTF_PARTNER_ID);
    formData.append("command", command);
    formData.append("sign", sign);

    console.log("Sending card to gachthefast.com:", { telco: telcoUpper, amount, request_id });

    const apiResponse = await fetch("https://gachthefast.com/chargingws/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = await apiResponse.json();
    console.log("gachthefast.com response:", result);

    // Update topup_request with request_id
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (topup_request_id) {
      await supabase
        .from("topup_requests")
        .update({ request_id, card_result: JSON.stringify(result) })
        .eq("id", topup_request_id);
    }

    return new Response(
      JSON.stringify({ success: true, request_id, api_result: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("charge-card error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
