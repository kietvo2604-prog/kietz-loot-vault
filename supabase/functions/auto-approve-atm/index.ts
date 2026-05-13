import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topup_request_id, transfer_amount } = await req.json();

    // Validate inputs
    if (!topup_request_id || !transfer_amount || typeof transfer_amount !== "number" || transfer_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid fields. Required: topup_request_id (string), transfer_amount (number > 0)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get topup request details
    const { data: topupRequest, error: topupError } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("id", topup_request_id)
      .single();

    if (topupError || !topupRequest) {
      return new Response(
        JSON.stringify({ error: "Topup request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already processed
    if (topupRequest.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Topup request already processed. Status: " + topupRequest.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate bonus: < 50k → +10%, >= 50k → +5%
    const bonusRate = transfer_amount < 50000 ? 0.10 : 0.05;
    const bonusAmount = Math.floor(transfer_amount * bonusRate);
    const creditAmount = transfer_amount + bonusAmount;

    // Update topup request to approved
    const { error: updateTopupError } = await supabase
      .from("topup_requests")
      .update({
        status: "approved",
        amount: creditAmount,
        original_amount: transfer_amount,
        auto_approved: true,
        note: `${topupRequest.note || "Chuyển khoản ATM"} | Auto-approved: Gốc ${transfer_amount}đ + Bonus ${bonusRate * 100}%: ${bonusAmount}đ`,
      })
      .eq("id", topup_request_id);

    if (updateTopupError) {
      console.error("Update topup error:", updateTopupError);
      return new Response(
        JSON.stringify({ error: "Failed to update topup request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile to update balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance, display_name")
      .eq("user_id", topupRequest.user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit balance
    const { error: updateBalanceError } = await supabase
      .from("profiles")
      .update({ balance: profile.balance + creditAmount })
      .eq("user_id", topupRequest.user_id);

    if (updateBalanceError) {
      console.error("Update balance error:", updateBalanceError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`ATM Auto-approval success: ${profile.display_name} → +${creditAmount}đ (${transfer_amount} + ${bonusAmount} bonus)`);

    return new Response(
      JSON.stringify({
        success: true,
        topup_request_id,
        user: profile.display_name,
        original_amount: transfer_amount,
        bonus_rate: `${bonusRate * 100}%`,
        bonus_amount: bonusAmount,
        credit_amount: creditAmount,
        new_balance: profile.balance + creditAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-approve-atm error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
