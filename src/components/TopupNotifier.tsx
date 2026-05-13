import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopupRequest {
  status: string;
  amount?: number;
}

/**
 * Listens to realtime changes on topup_requests for the current user.
 * Shows a toast when a card topup is approved (balance credited).
 * Silently ignores rejected cards.
 */
const TopupNotifier = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`topup-notify-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "topup_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as TopupRequest;
          const oldRecord = payload.old as TopupRequest;

          // Only trigger when status changes from pending to approved
          if (oldRecord.status === "pending" && newRecord.status === "approved") {
            const amount = newRecord.amount;
            toast.success(`💰 Nạp tiền thành công!`, {
              description: `Tài khoản đã được cộng ${amount?.toLocaleString("vi-VN")}đ`,
              duration: 8000,
            });
          }
          // Rejected cards → silently ignored (no notification)
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};

export default TopupNotifier;
