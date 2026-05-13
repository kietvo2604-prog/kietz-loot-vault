import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    // Nhận dữ liệu từ SePay
    const body = await req.json();

    const transfer_content = body.content?.trim();
    const amount = Number(body.transferAmount || 0);
    const transfer_type = body.transferType;

    // Chỉ nhận tiền vào
    if (transfer_type !== "in") {
      return new Response(
        JSON.stringify({
          error: "Not incoming transfer"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Kiểm tra dữ liệu
    if (!transfer_content || amount <= 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid transfer data"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Kiểm tra số tiền tối thiểu 10k
    if (amount < 10000) {
      return new Response(
        JSON.stringify({
          error: "Minimum transfer amount is 10,000 VND",
          received: amount
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Tìm mã VAK
    const match = transfer_content
      .toUpperCase()
      .match(/VAK\d{3}/);

    if (!match) {
      return new Response(
        JSON.stringify({
          error: "No valid VAK code found",
          transfer_content
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const vakCode = match[0];

    // Kết nối Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Tìm user bằng transfer_code
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, balance, display_name, transfer_code")
      .eq("transfer_code", vakCode)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          error: "No user found with transfer code: " + vakCode
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Bonus nạp
    const bonusRate = amount < 50000 ? 0.10 : 0.05;
    const bonusAmount = Math.floor(amount * bonusRate);

    const creditAmount = amount + bonusAmount;

    // Lưu lịch sử nạp
    const { error: insertError } = await supabase
      .from("topup_requests")
      .insert({
        user_id: profile.user_id,
        amount: creditAmount,
        method: "SePay",
        status: "approved",
        note: `Nội dung: ${transfer_content}`
      });

    if (insertError) {

      console.error(insertError);

      return new Response(
        JSON.stringify({
          error: "Failed to create topup record"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Cộng balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        balance: Number(profile.balance) + creditAmount
      })
      .eq("user_id", profile.user_id);

    if (updateError) {

      console.error(updateError);

      return new Response(
        JSON.stringify({
          error: "Failed to update balance"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(
      `Topup success: ${vakCode} → +${creditAmount}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: vakCode,
        amount,
        bonusAmount,
        creditAmount
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    console.error("bank-callback error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
