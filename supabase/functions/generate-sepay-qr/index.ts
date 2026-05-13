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

    // Sepay configuration
    const SEPAY_ACCOUNT_ID = "58848";
    const SEPAY_API_KEY = "L8RMFVLQ3E1Z0ESVN8BIUCMFSPQJXVBDOWBAMDJWG24A9GP3QHY0BKXZUHTIPWOL";
    
    // MB Bank details
    const BANK_ACCOUNT = "0987672604";
    const ACCOUNT_NAME = "VO ANH KIET";

    // Generate Sepay QR code
    // Format: https://api.sepay.vn/api/qrcode/generate?bank=MB&account={account}&amount={amount}&accountName={accountName}&desc={desc}
    const description = transfer_code; // Use transfer_code as description
    const qrUrl = new URL("https://api.sepay.vn/api/qrcode/generate");
    qrUrl.searchParams.append("bank", "MB");
    qrUrl.searchParams.append("account", BANK_ACCOUNT);
    qrUrl.searchParams.append("accountName", ACCOUNT_NAME);
    qrUrl.searchParams.append("desc", description);
    if (amount) {
      qrUrl.searchParams.append("amount", amount.toString());
    }

    // Fetch QR code from Sepay API
    const qrResponse = await fetch(qrUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${SEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!qrResponse.ok) {
      console.error("Sepay API error:", await qrResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to generate QR code from Sepay" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const qrData = await qrResponse.json();
    const qrCodeUrl = qrData.data?.qrUrl || qrData.qrUrl;

    if (!qrCodeUrl) {
      console.error("No QR URL in response:", qrData);
      return new Response(
        JSON.stringify({ error: "Invalid response from Sepay" }),
        { status: 500, headers: corsHeaders }
      );
    }

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
