import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingBag, Wallet, TrendingUp, Clock,
  ArrowDownLeft, ArrowUpRight, CheckCircle, XCircle,
  Loader2, AlertCircle, FileText
} from "lucide-react";

type Tab = "orders" | "activity" | "balance";

type TopupRequest = {
  id: string;
  amount: number;
  method: string;
  status: string;
  note: string | null;
  created_at: string;
};

type Order = {
  id: string;
  order_code: string | null;
  product_name: string;
  product_category: string;
  price: number;
  status: string;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "orders";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileBalance, setProfileBalance] = useState(0);

  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["orders", "activity", "balance"].includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [topupRes, profileRes, ordersRes] = await Promise.all([
        supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("balance").eq("user_id", user.id).single(),
        supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setTopups(topupRes.data || []);
      setOrders((ordersRes.data as Order[]) || []);
      setProfileBalance(profileRes.data?.balance || 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
    { id: "orders", label: "Đơn hàng", icon: ShoppingBag },
    { id: "activity", label: "Nhật ký", icon: Clock },
    { id: "balance", label: "Biến động số dư", icon: TrendingUp },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 border-primary/30 text-primary">
            <CheckCircle className="w-3 h-3" /> Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-destructive/10 border-destructive/30 text-destructive">
            <XCircle className="w-3 h-3" /> Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  // Build balance change events from topups AND orders
  const balanceEvents = [
    ...topups
      .filter((t) => t.status === "approved")
      .map((t) => ({
        id: t.id,
        type: "topup" as const,
        label: t.method,
        amount: t.amount,
        date: t.created_at,
      })),
    ...orders.map((o) => ({
      id: o.id,
      type: "purchase" as const,
      label: o.product_name,
      amount: o.price,
      date: o.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalTopup = topups.filter((t) => t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const totalSpent = orders.reduce((s, o) => s + o.price, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để xem lịch sử giao dịch.</p>
          <a href="/dang-nhap" className="inline-block px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-lg text-sm">
            Đăng nhập
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary neon-text text-center">
          LỊCH SỬ GIAO DỊCH
        </h1>
        <p className="text-center text-muted-foreground text-sm">
          Theo dõi đơn hàng, nhật ký hoạt động và biến động số dư
        </p>

        {/* Tabs */}
        <div className="flex gap-2 justify-center flex-wrap">
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

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Tab: Đơn hàng */}
            {tab === "orders" && (
              <div className="space-y-3 animate-slide-up">
                {orders.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-10 text-center">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Chưa có đơn hàng nào.</p>
                    <p className="text-xs text-muted-foreground mt-1">Các tài khoản bạn đã mua sẽ hiển thị ở đây.</p>
                  </div>
                ) : (
                  orders.map((o) => (
                    <div key={o.id} className="bg-card border border-primary/20 rounded-xl p-4 neon-card flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{o.product_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{o.product_category}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(o.created_at).toLocaleString("vi-VN")}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/don-hang/${o.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Chi tiết
                      </Link>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-destructive text-sm">-{formatVND(o.price)}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 border-primary/30 text-primary">
                          <CheckCircle className="w-3 h-3" /> Thành công
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Nhật ký hoạt động */}
            {tab === "activity" && (
              <div className="space-y-3 animate-slide-up">
                {topups.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-10 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Chưa có hoạt động nạp tiền nào.</p>
                  </div>
                ) : (
                  topups.map((t) => (
                    <div
                      key={t.id}
                      className={`bg-card border rounded-xl p-4 neon-card flex items-center justify-between gap-4 ${
                        t.status === "approved"
                          ? "border-primary/30"
                          : t.status === "rejected"
                          ? "border-destructive/30"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            t.status === "approved"
                              ? "bg-primary/10"
                              : t.status === "rejected"
                              ? "bg-destructive/10"
                              : "bg-accent/10"
                          }`}
                        >
                          {t.status === "approved" ? (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          ) : t.status === "rejected" ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <Clock className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">{t.method}</p>
                          {t.note && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] md:max-w-[350px]">
                              {t.note}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(t.created_at).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-bold text-sm ${
                            t.status === "approved"
                              ? "text-primary"
                              : t.status === "rejected"
                              ? "text-destructive line-through"
                              : "text-accent"
                          }`}
                        >
                          {t.status === "rejected" ? "" : "+"}{formatVND(t.amount)}
                        </p>
                        {statusBadge(t.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Biến động số dư */}
            {tab === "balance" && (
              <div className="space-y-4 animate-slide-up">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-xl p-5 neon-card text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Số dư hiện tại</p>
                    <p className="font-display text-xl font-bold text-primary neon-text">{formatVND(profileBalance)}</p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5 neon-card text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                      <ArrowDownLeft className="w-6 h-6 text-secondary" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Tổng nạp thành công</p>
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

                {/* Balance timeline */}
                <div className="bg-card border border-border rounded-xl p-6 neon-card">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Biến động gần đây</h3>
                  </div>

                  {balanceEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Chưa có biến động nào.</p>
                  ) : (
                    <div className="space-y-0">
                      {balanceEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between py-3 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            {event.type === "topup" ? (
                              <ArrowDownLeft className="w-4 h-4 text-primary" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-destructive" />
                            )}
                            <div>
                              <p className="text-sm text-foreground">{event.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(event.date).toLocaleString("vi-VN")}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`font-bold text-sm ${
                              event.type === "topup" ? "text-primary" : "text-destructive"
                            }`}
                          >
                            {event.type === "topup" ? `+${formatVND(event.amount)}` : `-${formatVND(event.amount)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default History;
