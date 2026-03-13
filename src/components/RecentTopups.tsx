import { useState, useEffect } from "react";
import { Wallet, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopupEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  amount: number;
  created_at: string;
}

const maskName = (name: string | null) => {
  if (!name || name.length <= 3) return "***";
  return "***" + name.slice(-3);
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const RecentTopups = () => {
  const [topups, setTopups] = useState<TopupEntry[]>([]);

  useEffect(() => {
    const fetchTopups = async () => {
      const { data } = await supabase
        .from("topup_requests")
        .select("user_id, amount, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!data || data.length === 0) return;

      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p; });

      setTopups(data.map(t => ({
        user_id: t.user_id,
        amount: t.amount,
        created_at: t.created_at,
        display_name: profileMap[t.user_id]?.display_name || "User",
        avatar_url: profileMap[t.user_id]?.avatar_url || null,
      })));
    };
    fetchTopups();
  }, []);

  if (topups.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 neon-card h-full">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-accent" />
        <h2 className="font-display text-sm font-bold text-foreground">LỊCH SỬ NẠP GẦN ĐÂY</h2>
      </div>
      <div className="space-y-1.5">
        {topups.map((t, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 rounded-full bg-muted border border-border overflow-hidden shrink-0">
              {t.avatar_url ? (
                <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {(t.display_name || "?")[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {maskName(t.display_name)} <span className="text-muted-foreground">đã nạp</span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(t.created_at)}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-accent font-mono shrink-0">+{formatVND(t.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTopups;
