import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

type TopupRequest = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  note: string | null;
  created_at: string;
};

const AdminTopups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("topup_requests").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const calculateCredit = (amount: number, method: string): number => {
    const isCard = method.toLowerCase().includes("thẻ cào");
    if (isCard) {
      // Card: 80% (20% tax)
      return Math.floor(amount * 0.8);
    } else {
      // ATM/Wallet: < 50k → +10%, >= 50k → +5%
      if (amount >= 50000) {
        return Math.floor(amount * 1.05);
      } else {
        return Math.floor(amount * 1.10);
      }
    }
  };

  const handleAction = async (id: string, userId: string, amount: number, method: string, action: "approved" | "rejected") => {
    setActionLoading(id);
    await supabase.from("topup_requests").update({ status: action, reviewed_by: user?.id }).eq("id", id);
    if (action === "approved") {
      const creditAmount = calculateCredit(amount, method);
      const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", userId).single();
      if (profile) {
        await supabase.from("profiles").update({ balance: profile.balance + creditAmount }).eq("user_id", userId);
      }
      const isCard = method.toLowerCase().includes("thẻ cào");
      toast({
        title: "✅ Đã duyệt — Cộng tiền thành công",
        description: isCard
          ? `Mệnh giá ${formatVND(amount)} → Thực cộng ${formatVND(creditAmount)} (thuế 20%)`
          : `Nạp ${formatVND(amount)} → Thực cộng ${formatVND(creditAmount)} (bonus ${amount >= 50000 ? "+5%" : "+10%"})`,
      });
    } else {
      toast({ title: "❌ Đã từ chối", description: `Yêu cầu nạp ${formatVND(amount)} đã bị từ chối.`, variant: "destructive" });
    }
    setActionLoading(null);
    fetchRequests();
  };

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <span className="flex items-center gap-1 text-neon-orange text-xs font-semibold"><Clock className="w-3 h-3" />Chờ duyệt</span>;
      case "approved": return <span className="flex items-center gap-1 text-primary text-xs font-semibold"><CheckCircle className="w-3 h-3" />Đã duyệt</span>;
      case "rejected": return <span className="flex items-center gap-1 text-destructive text-xs font-semibold"><XCircle className="w-3 h-3" />Từ chối</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-primary neon-text">DUYỆT NẠP TIỀN</h1>

      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
            {f === "all" ? "Tất cả" : f === "pending" ? "Chờ duyệt" : f === "approved" ? "Đã duyệt" : "Từ chối"}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Phương thức</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Chi tiết</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Mệnh giá</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Thực cộng</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Trạng thái</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Thời gian</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Không có yêu cầu</td></tr>
              ) : (
                requests.map((r) => {
                  const creditAmount = calculateCredit(r.amount, r.method);
                  return (
                    <tr key={r.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${r.status === "approved" ? "bg-primary/5" : r.status === "rejected" ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3 text-foreground">{r.method}</td>
                      <td className="px-4 py-3">
                        {r.note ? (
                          <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                            {r.note.split(" | ").map((part, i) => (<div key={i}>{part}</div>))}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground font-mono font-bold">{formatVND(r.amount)}</td>
                      <td className="px-4 py-3 text-primary font-mono font-bold">{formatVND(creditAmount)}</td>
                      <td className="px-4 py-3">
                        {statusBadge(r.status)}
                        {r.status === "approved" && <p className="text-[10px] text-primary mt-0.5">Đã cộng {formatVND(creditAmount)} ✓</p>}
                        {r.status === "rejected" && <p className="text-[10px] text-destructive mt-0.5">Từ chối ✗</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button disabled={actionLoading === r.id}
                              onClick={() => handleAction(r.id, r.user_id, r.amount, r.method, "approved")}
                              className="px-3 py-1.5 text-xs font-semibold gradient-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                              {actionLoading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Duyệt
                            </button>
                            <button disabled={actionLoading === r.id}
                              onClick={() => handleAction(r.id, r.user_id, r.amount, r.method, "rejected")}
                              className="px-3 py-1.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                              {actionLoading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Từ chối
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTopups;
