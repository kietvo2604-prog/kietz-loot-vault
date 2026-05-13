import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Zap, CheckCircle, DollarSign } from "lucide-react";

type AutoApprovalStat = {
  total_auto_approved: number;
  total_amount_auto_approved: number;
  today_auto_approved: number;
  today_amount_auto_approved: number;
};

const AdminAutoApprovalStats = () => {
  const [stats, setStats] = useState<AutoApprovalStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get total auto-approved
      const { data: allAutoApproved } = await supabase
        .from("topup_requests")
        .select("amount")
        .eq("auto_approved", true)
        .eq("status", "approved");

      // Get today's auto-approved
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayAutoApproved } = await supabase
        .from("topup_requests")
        .select("amount")
        .eq("auto_approved", true)
        .eq("status", "approved")
        .gte("created_at", today.toISOString());

      const totalAmount = (allAutoApproved || []).reduce((sum, r) => sum + r.amount, 0);
      const todayAmount = (todayAutoApproved || []).reduce((sum, r) => sum + r.amount, 0);

      setStats({
        total_auto_approved: allAutoApproved?.length || 0,
        total_amount_auto_approved: totalAmount,
        today_auto_approved: todayAutoApproved?.length || 0,
        today_amount_auto_approved: todayAmount,
      });
    } catch (error) {
      console.error("Error fetching auto-approval stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  if (loading || !stats) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Thống kê tự động phê duyệt</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today Stats */}
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-accent" />
            <p className="text-xs font-semibold text-muted-foreground">HÔM NAY</p>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold text-accent">{stats.today_auto_approved}</p>
              <p className="text-xs text-muted-foreground">giao dịch tự động</p>
            </div>
            <div className="pt-2 border-t border-accent/20">
              <p className="text-lg font-bold text-accent">{formatVND(stats.today_amount_auto_approved)}</p>
              <p className="text-xs text-muted-foreground">tổng tiền</p>
            </div>
          </div>
        </div>

        {/* Total Stats */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">TỔNG CỘNG</p>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold text-primary">{stats.total_auto_approved}</p>
              <p className="text-xs text-muted-foreground">giao dịch tự động</p>
            </div>
            <div className="pt-2 border-t border-primary/20">
              <p className="text-lg font-bold text-primary">{formatVND(stats.total_amount_auto_approved)}</p>
              <p className="text-xs text-muted-foreground">tổng tiền</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAutoApprovalStats;
