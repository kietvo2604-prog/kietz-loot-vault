import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Smartphone, Wallet, Gift, ArrowRight, Loader2, Clock, CheckCircle, XCircle, History, Landmark
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

type TopupRequest = {
  id: string;
  amount: number;
  method: string;
  status: string;
  note: string | null;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "d";

const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentTopups, setRecentTopups] = useState<TopupRequest[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingTopups(true);
      const [profileRes, topupRes] = await Promise.all([
        supabase.from("profiles").select("balance").eq("user_id", user.id).single(),
        supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setBalance(profileRes.data?.balance ?? 0);
      setRecentTopups(topupRes.data || []);
      setLoadingTopups(false);
    };
    fetchData();
  }, [user]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            <Clock className="w-3 h-3" /> Cho xu ly
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 border-primary/30 text-primary">
            <CheckCircle className="w-3 h-3" /> Da duyet
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-destructive/10 border-destructive/30 text-destructive">
            <XCircle className="w-3 h-3" /> Tu choi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-primary neon-text">NAP TIEN VAO TAI KHOAN</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Chon hinh thuc nap tien phu hop — Tu dong 24/7</p>
        </div>

        {/* Balance Card */}
        {user && balance !== null && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full gradient-primary flex items-center justify-center">
                  <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">So du hien tai</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500">{formatVND(balance)}</p>
                </div>
              </div>
              <Link to="/bien-dong-so-du" className="text-primary text-xs sm:text-sm font-semibold hover:underline">
                Xem bien dong →
              </Link>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* ATM Card */}
          <button
            onClick={() => navigate("/nap-atm")}
            className="group bg-card border border-border rounded-xl p-4 sm:p-6 neon-card hover:border-primary/50 transition-all text-left"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                <Landmark className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-foreground text-sm sm:text-base">ATM / Vi dien tu</h3>
                  <span className="gradient-accent text-accent-foreground text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">+10%</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Chuyen khoan ngan hang - Xu ly tu dong</p>
                <div className="flex items-center text-primary text-xs sm:text-sm font-semibold group-hover:gap-2 transition-all">
                  <span>Nap ngay</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent shrink-0" />
                <p className="text-[10px] sm:text-xs text-accent">Nap duoi 50k +10% bonus, tu 50k +5% bonus!</p>
              </div>
            </div>
          </button>

          {/* Card TopUp */}
          <button
            onClick={() => navigate("/nap-the-cao")}
            className="group bg-card border border-border rounded-xl p-4 sm:p-6 neon-card hover:border-primary/50 transition-all text-left"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-foreground text-sm sm:text-base">The cao dien thoai</h3>
                  <span className="bg-destructive/10 text-destructive text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-destructive/20">-20%</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Viettel, Vinaphone, Mobifone, Garena</p>
                <div className="flex items-center text-primary text-xs sm:text-sm font-semibold group-hover:gap-2 transition-all">
                  <span>Nap ngay</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-[10px] sm:text-xs text-destructive">Chiet khau 20% - Xu ly tu dong 24/7</p>
            </div>
          </button>
        </div>

        {/* Recent Top-up History */}
        {user && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card space-y-3 sm:space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground">Lich su nap gan day</h3>
              </div>
              <Link to="/lich-su-nap" className="text-primary text-[10px] sm:text-xs font-semibold hover:underline">Xem tat ca →</Link>
            </div>
            {loadingTopups ? (
              <div className="flex justify-center py-4 sm:py-6"><Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" /></div>
            ) : recentTopups.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">Chua co lich su nap tien.</p>
            ) : (
              <div className="space-y-2">
                {recentTopups.map((t) => (
                  <div key={t.id} className={`flex items-center justify-between py-2.5 sm:py-3 px-2.5 sm:px-3 rounded-lg border ${t.status === "approved" ? "border-primary/20" : t.status === "rejected" ? "border-destructive/20" : "border-border"} bg-muted/30`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${t.status === "approved" ? "bg-primary/10" : t.status === "rejected" ? "bg-destructive/10" : "bg-accent/10"}`}>
                        {t.status === "approved" ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> : t.status === "rejected" ? <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" /> : <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{t.method}</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-xs sm:text-sm ${t.status === "approved" ? "text-primary" : t.status === "rejected" ? "text-destructive line-through" : "text-accent"}`}>
                        {t.status === "rejected" ? "" : "+"}{formatVND(t.amount)}
                      </p>
                      {statusBadge(t.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guide */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-3 text-sm sm:text-base">Huong dan nap tien</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>Chon phuong thuc nap tien phu hop voi ban</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>Voi ATM/Vi dien tu: Chuyen khoan theo huong dan va ghi dung noi dung</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Voi The cao: Nhap dung so Seri, Ma the va Menh gia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>Tien se duoc cong tu dong sau khi xu ly thanh cong</span>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TopUp;
