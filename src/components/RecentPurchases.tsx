import { useState, useEffect } from "react";
import { ShoppingBag, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseEntry {
  product_name: string;
  product_category: string;
  price: number;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
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

const RecentPurchases = () => {
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);

  useEffect(() => {
    supabase.rpc("get_recent_purchases", { limit_count: 8 }).then(({ data }) => {
      setPurchases((data as PurchaseEntry[]) || []);
    });
  }, []);

  if (purchases.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 neon-card h-full">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-bold text-foreground">LỊCH SỬ MUA GẦN ĐÂY</h2>
      </div>
      <div className="space-y-1.5">
        {purchases.map((p, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 rounded-full bg-muted border border-border overflow-hidden shrink-0">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {(p.display_name || "?")[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{maskName(p.display_name)} <span className="text-muted-foreground">đã mua</span> {p.product_name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="px-1 py-0.5 bg-muted rounded">{p.product_category}</span>
                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(p.created_at)}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary font-mono shrink-0">{formatVND(p.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentPurchases;
