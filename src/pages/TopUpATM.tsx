import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Gift, Copy, CheckCircle, Loader2, Clock, XCircle, History
} from "lucide-react";
import { Link } from "react-router-dom";

const banks: { name: string; number: string; holder: string }[] = [
  { name: "MB Bank", number: "0987672604", holder: "VO ANH KIET" },
  { name: "BV Bank", number: "99ZP25275M36980652", holder: "ZALOPAY_VO ANH KIET" },
];

type TopupRequest = {
  id: string;
  amount: number;
  method: string;
  status: string;
  note: string | null;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "d";

const TopUpATM = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState("");
  const [recentTopups, setRecentTopups] = useState<TopupRequest[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [transferCode, setTransferCode] = useState<string | null>(null);
  const [atmAmount, setAtmAmount] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [pendingAtmRequest, setPendingAtmRequest] = useState<TopupRequest | null>(null);
  const [sepayQrUrl, setSepayQrUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingTopups(true);
      setLoadingQr(true);
      const [profileRes, topupRes] = await Promise.all([
        supabase.from("profiles").select("transfer_code, bank_qr_code").eq("user_id", user.id).single(),
        supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      
      setTransferCode(profileRes.data?.transfer_code || null);
      setSepayQrUrl(profileRes.data?.bank_qr_code || null);
      setRecentTopups(topupRes.data || []);
      
      const pendingAtm = (topupRes.data || []).find(
        (t) => t.status === "pending" && t.method.toLowerCase().includes("chuyen khoan")
      );
      setPendingAtmRequest(pendingAtm || null);
      
      if (!profileRes.data?.bank_qr_code && profileRes.data?.transfer_code) {
        try {
          const { data: qrData, error: qrError } = await supabase.functions.invoke("generate-sepay-qr", {
            body: {
              user_id: user.id,
              transfer_code: profileRes.data.transfer_code,
            },
          });
          
          if (qrError) {
            console.error("QR generation error:", qrError);
          } else if (qrData?.qr_url) {
            setSepayQrUrl(qrData.qr_url);
          } else if (qrData?.success) {
            const { data: updatedProfile } = await supabase
              .from("profiles")
              .select("bank_qr_code")
              .eq("user_id", user.id)
              .single();
            if (updatedProfile?.bank_qr_code) {
              setSepayQrUrl(updatedProfile.bank_qr_code);
            }
          }
        } catch (err) {
          console.error("QR generation exception:", err);
        }
      }
      
      setLoadingTopups(false);
      setLoadingQr(false);
    };
    fetchData();
  }, [user]);

  const handleAutoApproveAtm = async () => {
    if (!user || !pendingAtmRequest) {
      toast({ title: "Loi", description: "Khong co yeu cau chuyen khoan cho xu ly.", variant: "destructive" });
      return;
    }
    
    if (!atmAmount.trim()) {
      toast({ title: "Loi", description: "Vui long nhap so tien da chuyen.", variant: "destructive" });
      return;
    }

    const amount = parseInt(atmAmount.replace(/\D/g, ""), 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Loi", description: "Vui long nhap so tien hop le.", variant: "destructive" });
      return;
    }

    setApproveLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-approve-atm", {
        body: { topup_request_id: pendingAtmRequest.id, transfer_amount: amount },
      });

      if (error || !data?.success) {
        toast({
          title: "Loi",
          description: data?.error || "Khong the phe duyet. Vui long thu lai.",
          variant: "destructive",
        });
        setApproveLoading(false);
        return;
      }

      toast({
        title: "Da phe duyet tu dong",
        description: `Nap ${formatVND(amount)} → Thuc cong ${formatVND(data.credit_amount)} (bonus ${data.bonus_rate})`,
      });

      setAtmAmount("");
      setPendingAtmRequest(null);

      const { data: newTopups } = await supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
      setRecentTopups(newTopups || []);
    } catch (err) {
      toast({
        title: "Loi",
        description: err instanceof Error ? err.message : "Loi khong xac dinh",
        variant: "destructive",
      });
    } finally {
      setApproveLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
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
        <div className="text-center space-y-2">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-primary neon-text">NAP QUA ATM / VI DIEN TU</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Chuyen khoan ngan hang - Tu dong 24/7</p>
        </div>

        {/* ATM Content */}
        <div className="space-y-4 sm:space-y-6 animate-slide-up">
          <div className="gradient-accent rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-accent-foreground shrink-0" />
              <div>
                <p className="font-bold text-sm sm:text-base text-accent-foreground">UU DAI KHI NAP ATM</p>
                <p className="text-xs sm:text-sm text-accent-foreground/80">Nap duoi 50k → +10% bonus. Tu 50k tro len → +5% bonus!</p>
              </div>
            </div>
            <span className="font-display text-xl sm:text-2xl font-bold text-accent-foreground">+10%</span>
          </div>

          {/* Bank accounts */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-neon-cyan" />
              <h2 className="font-display text-base sm:text-lg font-bold text-secondary neon-cyan-text">CHUYEN KHOAN NGAN HANG</h2>
            </div>
            <div className="space-y-3">
              {/* MB Bank with Sepay QR */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-xl overflow-hidden shadow-lg">
                {/* Bank Header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base">MB Bank</h3>
                    <p className="text-blue-100 text-[10px] sm:text-xs">VO ANH KIET</p>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white p-4 sm:p-6 space-y-4">
                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center">
                    {loadingQr ? (
                      <div className="w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-100 rounded-lg">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-400" />
                      </div>
                    ) : sepayQrUrl ? (
                      <img 
                        src={sepayQrUrl} 
                        alt="MB Bank Sepay QR" 
                        className="w-40 h-40 sm:w-56 sm:h-56 rounded-lg border-2 border-gray-200 object-contain" 
                      />
                    ) : (
                      <div className="w-40 h-40 sm:w-56 sm:h-56 bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-center text-xs sm:text-sm text-gray-500 px-4">QR code dang duoc tao...</p>
                      </div>
                    )}
                  </div>

                  {/* Account Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600 text-xs sm:text-sm">So tai khoan</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">0987672604</span>
                        <button 
                          onClick={() => handleCopy("0987672604", "MB Bank")} 
                          className="text-blue-600 hover:text-blue-700 text-[10px] sm:text-xs flex items-center gap-1"
                        >
                          {copiedField === "MB Bank" ? (
                            <><CheckCircle className="w-3 h-3" /> Da copy</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600 text-xs sm:text-sm">Chu tai khoan</span>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm">VO ANH KIET</span>
                    </div>

                    {/* Transfer Code */}
                    {transferCode && (
                      <div className="bg-pink-50 border border-pink-200 rounded-lg p-2.5 sm:p-3 mt-3">
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1">NOI DUNG CHUYEN KHOAN</p>
                        <div className="flex items-center justify-between">
                          <code className="font-bold text-red-600 text-xs sm:text-sm">{transferCode}</code>
                          <button 
                            onClick={() => handleCopy(transferCode, "content")} 
                            className="text-blue-600 hover:text-blue-700 text-[10px] sm:text-xs flex items-center gap-1"
                          >
                            {copiedField === "content" ? (
                              <><CheckCircle className="w-3 h-3" /> Da copy</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Other banks */}
              {banks.slice(1).map((bank) => (
                <div key={bank.name} className="bg-muted border border-border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-foreground text-sm sm:text-base">{bank.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground">STK: </span>
                      <span className="text-foreground font-mono text-xs break-all">{bank.number}</span>
                    </div>
                    <button onClick={() => handleCopy(bank.number, bank.name)} className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] sm:text-xs justify-start sm:justify-end">
                      {copiedField === bank.name ? <><CheckCircle className="w-3 h-3" /> Da copy</> : <><Copy className="w-3 h-3" /> Copy STK</>}
                    </button>
                  </div>
                  {bank.holder && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Chu TK: {bank.holder}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Transfer note with unique code */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card">
            <h3 className="font-bold text-foreground mb-3 text-sm sm:text-base">Noi dung chuyen khoan</h3>
            {transferCode ? (
              <div className="bg-muted border border-primary/30 rounded-lg p-3 sm:p-4 flex items-center justify-between">
                <code className="text-primary font-mono text-sm sm:text-lg font-bold break-all">{transferCode}</code>
                <button onClick={() => handleCopy(transferCode, "content")} className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] sm:text-xs shrink-0 ml-2">
                  {copiedField === "content" ? <><CheckCircle className="w-3 h-3" /> Da copy</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            ) : (
              <div className="bg-muted border border-border rounded-lg p-3 sm:p-4 text-center">
                <p className="text-muted-foreground text-xs sm:text-sm">Vui long dang nhap de xem ma noi dung chuyen khoan cua ban.</p>
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-3">
              Moi tai khoan co mot ma rieng. Vui long ghi dung noi dung chuyen khoan de he thong tu dong cong tien.
            </p>
          </div>

          {/* Auto-Approve ATM Transfer */}
          {pendingAtmRequest && (
            <div className="bg-card border border-accent/30 rounded-xl p-4 sm:p-6 neon-card">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                <h3 className="font-bold text-foreground text-sm sm:text-base">Da chuyen khoan?</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Ban co yeu cau chuyen khoan ATM dang cho xu ly. Hay nhap so tien ban da chuyen de he thong tu dong phe duyet va cong tien ngay lap tuc.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">So tien da chuyen (VND)</label>
                  <input
                    type="text"
                    value={atmAmount}
                    onChange={(e) => setAtmAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="Vi du: 50000"
                    className="w-full bg-muted border border-border rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all"
                  />
                  {atmAmount && (
                    <p className="text-[10px] sm:text-xs text-accent mt-2">
                      Ban se nhan: <span className="font-bold">{formatVND(
                        parseInt(atmAmount, 10) < 50000 
                          ? Math.floor(parseInt(atmAmount, 10) * 1.10)
                          : Math.floor(parseInt(atmAmount, 10) * 1.05)
                      )}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAutoApproveAtm}
                  disabled={approveLoading || !atmAmount}
                  className="w-full py-2.5 sm:py-3 gradient-accent text-accent-foreground font-bold rounded-lg text-xs sm:text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {approveLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Dang xu ly...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Phe duyet tu dong → Cong tien ngay</>
                  )}
                </button>
              </div>
            </div>
          )}
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

export default TopUpATM;
