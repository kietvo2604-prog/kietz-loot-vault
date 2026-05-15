import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Smartphone, Copy, CheckCircle,
  AlertTriangle, ArrowRight, Loader2, Clock, XCircle, History
} from "lucide-react";
import { Link } from "react-router-dom";

const cardTypes = [
  { id: "viettel", name: "Viettel", color: "text-red-400", serialLengths: [11, 14], codeLengths: [13, 15], serialHint: "11 hoac 14 so", codeHint: "13 hoac 15 so" },
  { id: "vinaphone", name: "Vinaphone", color: "text-blue-400", serialLengths: [14], codeLengths: [12, 14], serialHint: "14 so", codeHint: "12 hoac 14 so" },
  { id: "mobifone", name: "Mobifone", color: "text-green-400", serialLengths: [15], codeLengths: [12], serialHint: "15 so", codeHint: "12 so" },
  { id: "garena", name: "Garena", color: "text-orange-400", serialLengths: [9], codeLengths: [9], serialHint: "9 so", codeHint: "9 so" },
];

const denominations = [10000, 20000, 50000, 100000, 200000, 500000];

type TopupRequest = {
  id: string;
  amount: number;
  method: string;
  status: string;
  note: string | null;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "d";

const TopUpCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState("viettel");
  const [selectedDenom, setSelectedDenom] = useState(100000);
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ serial?: string; code?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentTopups, setRecentTopups] = useState<TopupRequest[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);

  const currentCard = cardTypes.find((c) => c.id === selectedCard)!;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingTopups(true);
      const { data: topupData } = await supabase
        .from("topup_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentTopups(topupData || []);
      setLoadingTopups(false);
    };
    fetchData();
  }, [user]);

  const validateCard = () => {
    const newErrors: { serial?: string; code?: string } = {};
    const serialDigits = serial.replace(/\D/g, "");
    const codeDigits = code.replace(/\D/g, "");

    if (!serialDigits) {
      newErrors.serial = "Vui long nhap so Seri";
    } else if (!currentCard.serialLengths.includes(serialDigits.length)) {
      newErrors.serial = `So Seri ${currentCard.name} phai co ${currentCard.serialHint}`;
    }

    if (!codeDigits) {
      newErrors.code = "Vui long nhap ma the";
    } else if (!currentCard.codeLengths.includes(codeDigits.length)) {
      newErrors.code = `Ma the ${currentCard.name} phai co ${currentCard.codeHint}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateCard()) return;
    if (!user) {
      toast({ title: "Vui long dang nhap", description: "Ban can dang nhap de nap the.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const telcoMap: Record<string, string> = { viettel: "VIETTEL", vinaphone: "VINAPHONE", mobifone: "MOBIFONE", garena: "GARENA" };
    const telco = telcoMap[selectedCard];

    const { data: insertData, error: insertError } = await supabase.from("topup_requests").insert({
      user_id: user.id,
      amount: selectedDenom,
      method: `The cao ${currentCard.name}`,
      note: `Seri: ${serial} | Ma: ${code} | Menh gia: ${selectedDenom.toLocaleString("vi-VN")}d`,
    }).select("id").single();

    if (insertError || !insertData) {
      setSubmitting(false);
      toast({ title: "Loi", description: "Khong the gui yeu cau. Vui long thu lai.", variant: "destructive" });
      return;
    }

    try {
      const { error: apiError } = await supabase.functions.invoke("charge-card", {
        body: { telco, code, serial, amount: selectedDenom, user_id: user.id, topup_request_id: insertData.id },
      });

      if (apiError) {
        toast({ title: "Da gui the", description: "The dang duoc xu ly tu dong. Vui long cho ket qua." });
      } else {
        toast({ title: "Da gui the cao", description: `The ${currentCard.name} menh gia ${formatVND(selectedDenom)} dang duoc xu ly tu dong.` });
      }
      setSuccessMessage(`The ${currentCard.name} menh gia ${formatVND(selectedDenom)} dang duoc he thong xu ly tu dong.`);
    } catch {
      toast({ title: "Da gui the", description: "The dang duoc xu ly. Vui long kiem tra lich su nap tien." });
      setSuccessMessage(`The ${currentCard.name} da gui. Vui long kiem tra trang thai trong lich su nap tien.`);
    }

    const { data: newTopups } = await supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    setRecentTopups(newTopups || []);

    setSerial("");
    setCode("");
    setErrors({});
    setSubmitting(false);
  };

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
        {successMessage && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 sm:p-4 flex items-start gap-3 animate-slide-up">
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{successMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">Ban co the kiem tra trang thai trong lich su nap tien.</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">X</button>
          </div>
        )}

        <div className="text-center space-y-2">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-primary neon-text">NAP THE CAO</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Nap tien bang the cao dien thoai - Xu ly tu dong 24/7</p>
        </div>

        {/* Card Form */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card animate-slide-up space-y-4 sm:space-y-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-neon-cyan" />
            <h2 className="font-display text-base sm:text-lg font-bold text-secondary neon-cyan-text">NAP QUA THE CAO</h2>
            <span className="gradient-accent text-accent-foreground text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full">-20% chiet khau</span>
          </div>

          {/* Card Type */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">Chon loai the</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cardTypes.map((ct) => (
                <button key={ct.id} onClick={() => { setSelectedCard(ct.id); setSerial(""); setCode(""); setErrors({}); }}
                  className={`py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm border transition-all ${selectedCard === ct.id ? "border-primary bg-primary/10 text-primary neon-border" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  {ct.name}
                </button>
              ))}
            </div>
          </div>

          {/* Denomination */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">Menh gia</label>
            <div className="grid grid-cols-3 gap-2">
              {denominations.map((d) => (
                <button key={d} onClick={() => setSelectedDenom(d)}
                  className={`py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${selectedDenom === d ? "border-primary bg-primary/10 text-primary neon-border" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  {formatVND(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Serial & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">So Seri</label>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">{currentCard.name}: {currentCard.serialHint}</p>
              <input type="text" value={serial}
                onChange={(e) => { setSerial(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, serial: undefined })); }}
                placeholder={`Nhap so Seri (${currentCard.serialHint})...`}
                maxLength={Math.max(...currentCard.serialLengths)}
                className={`w-full bg-muted border rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.serial ? "border-destructive" : "border-border"}`} />
              {errors.serial && <p className="text-[10px] sm:text-xs text-destructive mt-1">{errors.serial}</p>}
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Ma the</label>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">{currentCard.name}: {currentCard.codeHint}</p>
              <input type="text" value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, code: undefined })); }}
                placeholder={`Nhap ma the (${currentCard.codeHint})...`}
                maxLength={Math.max(...currentCard.codeLengths)}
                className={`w-full bg-muted border rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.code ? "border-destructive" : "border-border"}`} />
              {errors.code && <p className="text-[10px] sm:text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 sm:p-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-destructive">Vui long nhap dung menh gia the cao. Nhap sai menh gia se bi mat the va khong duoc hoan tien.</p>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-2.5 sm:p-3 text-center text-xs sm:text-sm">
            <span className="text-muted-foreground">Menh gia: {formatVND(selectedDenom)} → Thuc nhan: </span>
            <span className="text-primary font-bold">{formatVND(selectedDenom * 0.8)}</span>
            <span className="text-destructive text-[10px] sm:text-xs ml-1">(-20%)</span>
          </div>

          <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 sm:py-3.5 gradient-primary text-primary-foreground font-bold rounded-lg text-xs sm:text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Dang gui yeu cau...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Nap the — Thuc nhan {formatVND(selectedDenom * 0.8)} <ArrowRight className="w-4 h-4" /></>
            )}
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
      </main>
      <Footer />
    </div>
  );
};

export default TopUpCard;
