import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { History as HistoryIcon, ShoppingBag, Wallet, BarChart3, Clock, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";

type Tab = "purchases" | "topups" | "balance";

const mockPurchases: { id: number; product: string; price: number; date: string; status: string }[] = [];

const mockTopups: { id: number; method: string; amount: number; received: number; date: string; status: string }[] = [];

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  success: { bg: "bg-primary/10 border-primary/30", text: "text-primary", label: "Thành công" },
  pending: { bg: "bg-accent/10 border-accent/30", text: "text-accent", label: "Đang xử lý" },
  failed: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Thất bại" },
};

const History = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "purchases";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["purchases", "topups", "balance"].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const totalTopup = mockTopups.filter(t => t.status === "success").reduce((s, t) => s + t.received, 0);
  const totalSpent = mockPurchases.filter(p => p.status === "success").reduce((s, p) => s + p.price, 0);
  const balance = totalTopup - totalSpent;

  const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
    { id: "purchases", label: "Mua ACC", icon: ShoppingBag },
    { id: "topups", label: "Nạp tiền", icon: Wallet },
    { id: "balance", label: "Thống kê", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary neon-text text-center">
          LỊCH SỬ GIAO DỊCH
        </h1>
        <p className="text-center text-muted-foreground text-sm">
          Theo dõi lịch sử mua hàng, nạp tiền và số dư tài khoản
        </p>

        {/* Tabs */}
        <div className="flex gap-2 justify-center">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all ${
                tab === t.id
                  ? "gradient-primary text-primary-foreground neon-border"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Purchases */}
        {tab === "purchases" && (
          <div className="space-y-3 animate-slide-up">
            {mockPurchases.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Chưa có lịch sử mua hàng</p>
              </div>
            ) : (
              mockPurchases.map((p) => {
                const s = statusStyles[p.status];
                return (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 neon-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{p.product}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {p.date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-destructive text-sm">-{formatVND(p.price)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Top-ups */}
        {tab === "topups" && (
          <div className="space-y-3 animate-slide-up">
            {mockTopups.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Chưa có lịch sử nạp tiền</p>
              </div>
            ) : (
              mockTopups.map((t) => {
                const s = statusStyles[t.status];
                return (
                  <div key={t.id} className="bg-card border border-border rounded-xl p-4 neon-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{t.method}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {t.date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-sm">+{formatVND(t.received)}</p>
                      {t.amount !== t.received && t.status === "success" && (
                        <p className="text-[10px] text-muted-foreground">Gốc: {formatVND(t.amount)}</p>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Balance Stats */}
        {tab === "balance" && (
          <div className="space-y-4 animate-slide-up">
            {/* Balance cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 neon-card text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Số dư hiện tại</p>
                <p className="font-display text-xl font-bold text-primary neon-text">{formatVND(balance)}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 neon-card text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                  <ArrowDownLeft className="w-6 h-6 text-secondary" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Tổng nạp</p>
                <p className="font-display text-xl font-bold text-secondary neon-cyan-text">{formatVND(totalTopup)}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 neon-card text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <ArrowUpRight className="w-6 h-6 text-accent" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Tổng chi tiêu</p>
                <p className="font-display text-xl font-bold text-accent">{formatVND(totalSpent)}</p>
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Hoạt động gần đây</h3>
              </div>
              <div className="space-y-3">
                {[...mockTopups.filter(t => t.status === "success").map(t => ({
                  type: "topup" as const, label: t.method, amount: t.received, date: t.date
                })),
                ...mockPurchases.filter(p => p.status === "success").map(p => ({
                  type: "purchase" as const, label: p.product, amount: p.price, date: p.date
                }))]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        {item.type === "topup" ? (
                          <ArrowDownLeft className="w-4 h-4 text-secondary" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-accent" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.date}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${item.type === "topup" ? "text-primary" : "text-destructive"}`}>
                        {item.type === "topup" ? "+" : "-"}{formatVND(item.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default History;
