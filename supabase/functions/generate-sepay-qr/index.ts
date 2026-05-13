import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, transfer_code, amount } = await req.json();

    if (!user_id || !transfer_code) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or transfer_code" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    // MB Bank details
    const BANK_ACCOUNT = "0987672604";
    const ACCOUNT_NAME = "VO ANH KIET";

    // Generate QR code URL directly using img.vietqr.io (free public API)
    // Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={DESCRIPTION}&accountName={NAME}
    // MB Bank ID: 970422
    const qrUrl = new URL("https://img.vietqr.io/image/970422-" + BANK_ACCOUNT + "-compact2.png");
    qrUrl.searchParams.append("addInfo", transfer_code);
    qrUrl.searchParams.append("accountName", ACCOUNT_NAME);
    if (amount) {
      qrUrl.searchParams.append("amount", amount.toString());
    }
    
    const qrCodeUrl = qrUrl.toString();
    console.log("[v0] Generated VietQR URL:", qrCodeUrl);

    // Save QR code URL to user profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        bank_qr_code: qrCodeUrl,
        bank_account: BANK_ACCOUNT,
        bank_name: "MB",
        account_holder: ACCOUNT_NAME,
        qr_generated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save QR code to database" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr_url: qrCodeUrl,
        bank: "MB",
        account: BANK_ACCOUNT,
        account_name: ACCOUNT_NAME,
        transfer_code,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
