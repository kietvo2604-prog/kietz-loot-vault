import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Gift, Copy, CheckCircle, Loader2, Clock, XCircle, History, Smartphone
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

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const TopUpATM = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState("");
  const [transferCode, setTransferCode] = useState<string | null>(null);
  const [recentTopups, setRecentTopups] = useState<TopupRequest[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [atmAmount, setAtmAmount] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [pendingAtmRequest, setPendingAtmRequest] = useState<TopupRequest | null>(null);
  const [sepayQrUrl, setSepayQrUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Generate VietQR URL directly using transfer_code
  const generateVietQrUrl = (transferCode: string) => {
    const bankId = "970422"; // MB Bank
    const accountNo = "0987672604";
    const accountName = "VO ANH KIET";
    const template = "compact2";
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(accountName)}`;
  };

  // Fetch transfer code and recent topups
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingTopups(true);
      setLoadingQr(true);
      
      try {
        const [profileRes, topupRes] = await Promise.all([
          supabase.from("profiles").select("transfer_code").eq("user_id", user.id).single(),
          supabase.from("topup_requests").select("*").eq("user_id", user.id).ilike("method", "%chuyển khoản%").order("created_at", { ascending: false }).limit(5),
        ]);
        
        let userTransferCode = profileRes.data?.transfer_code || null;
        
        // If no transfer_code exists, generate one using RPC function
        if (!userTransferCode && !profileRes.error) {
          try {
            const { data: newCode, error: rpcError } = await supabase.rpc("generate_transfer_code");
            if (!rpcError && newCode) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ transfer_code: newCode })
                .eq("user_id", user.id);
              if (!updateError) {
                userTransferCode = newCode;
              }
            }
          } catch (genErr) {
            console.error("Error generating transfer_code:", genErr);
          }
        }
        
        setTransferCode(userTransferCode);
        
        // Generate QR URL directly if we have transfer_code
        if (userTransferCode) {
          const qrUrl = generateVietQrUrl(userTransferCode);
          setSepayQrUrl(qrUrl);
        } else {
          setSepayQrUrl(null);
        }
        
        setRecentTopups(topupRes.data || []);
        
        // Find pending ATM transfer
        const pendingAtm = (topupRes.data || []).find(
          (t) => t.status === "pending" && t.method.toLowerCase().includes("chuyển khoản")
        );
        setPendingAtmRequest(pendingAtm || null);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
      
      setLoadingTopups(false);
      setLoadingQr(false);
    };
    fetchData();
  }, [user]);

  const handleAutoApproveAtm = async () => {
    if (!user || !pendingAtmRequest) {
      toast({ title: "Lỗi", description: "Không có yêu cầu chuyển khoản chờ xử lý.", variant: "destructive" });
      return;
    }
    
    if (!atmAmount.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập số tiền đã chuyển.", variant: "destructive" });
      return;
    }

    const amount = parseInt(atmAmount.replace(/\D/g, ""), 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Lỗi", description: "Vui lòng nhập số tiền hợp lệ.", variant: "destructive" });
      return;
    }

    setApproveLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-approve-atm", {
        body: { topup_request_id: pendingAtmRequest.id, transfer_amount: amount },
      });

      if (error || !data?.success) {
        toast({
          title: "Lỗi",
          description: data?.error || "Không thể phê duyệt. Vui lòng thử lại.",
          variant: "destructive",
        });
        setApproveLoading(false);
        return;
      }

      toast({
        title: "Đã phê duyệt tự động",
        description: `Nạp ${formatVND(amount)} - Thực cộng ${formatVND(data.credit_amount)} (bonus ${data.bonus_rate})`,
      });

      setAtmAmount("");
      setPendingAtmRequest(null);

      // Refresh topups list
      const { data: newTopups } = await supabase
        .from("topup_requests")
        .select("*")
        .eq("user_id", user.id)
        .ilike("method", "%chuyển khoản%")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentTopups(newTopups || []);
    } catch (err) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <Header />

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-lg space-y-4 sm:space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-primary neon-text">NẠP QUA ATM</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Chuyển khoản ngân hàng - Bonus +10%</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 justify-center">
          <Link to="/nap-the" className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all bg-muted text-muted-foreground hover:text-foreground hover:bg-border">
            <Smartphone className="w-4 h-4" /> Thẻ Cào
          </Link>
          <Link to="/nap-atm" className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all gradient-primary text-primary-foreground neon-border">
            <Wallet className="w-4 h-4" /> ATM
            <span className="gradient-accent text-accent-foreground text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full">+10%</span>
          </Link>
        </div>

        {/* Bonus Banner */}
        <div className="gradient-accent rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-accent-foreground" />
            <div>
              <p className="font-bold text-sm sm:text-base text-accent-foreground">BONUS KHI NẠP ATM</p>
              <p className="text-[10px] sm:text-sm text-accent-foreground/80">Dưới 50k: +10% | Từ 50k: +5%</p>
            </div>
          </div>
          <span className="font-display text-xl sm:text-2xl font-bold text-accent-foreground">+10%</span>
        </div>

        {/* Bank Account Card with QR */}
        <div className="bg-card border border-border rounded-xl overflow-hidden neon-card animate-slide-up">
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

          {/* QR Code Section */}
          <div className="bg-white p-4 sm:p-6 space-y-4">
            <div className="flex flex-col items-center justify-center">
              {loadingQr ? (
                <div className="w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-100 rounded-lg">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-400" />
                </div>
              ) : sepayQrUrl ? (
                <img 
                  src={sepayQrUrl} 
                  alt="MB Bank QR" 
                  className="w-44 h-44 sm:w-56 sm:h-56 rounded-lg border-2 border-gray-200 object-contain" 
                />
              ) : (
                <div className="w-44 h-44 sm:w-56 sm:h-56 bg-gray-100 rounded-lg flex items-center justify-center p-4">
                  <p className="text-center text-xs sm:text-sm text-gray-500">
                    {user ? "Đang tạo mã QR..." : "Vui lòng đăng nhập để xem QR"}
                  </p>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-600">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">0987672604</span>
                  <button 
                    onClick={() => handleCopy("0987672604", "MB Bank")} 
                    className="text-blue-600 hover:text-blue-700 text-[10px] sm:text-xs flex items-center gap-1"
                  >
                    {copiedField === "MB Bank" ? (
                      <><CheckCircle className="w-3 h-3" /> Đã copy</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-600">Chủ tài khoản</span>
                <span className="font-bold text-gray-900">VO ANH KIET</span>
              </div>

              {/* Transfer Code */}
              {transferCode && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mt-3">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1">NỘI DUNG CHUYỂN KHOẢN</p>
                  <div className="flex items-center justify-between">
                    <code className="font-bold text-red-600 text-sm sm:text-base">{transferCode}</code>
                    <button 
                      onClick={() => handleCopy(transferCode, "content")} 
                      className="text-blue-600 hover:text-blue-700 text-[10px] sm:text-xs flex items-center gap-1"
                    >
                      {copiedField === "content" ? (
                        <><CheckCircle className="w-3 h-3" /> Đã copy</>
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

        {/* Other Banks */}
        <div className="space-y-2">
          {banks.slice(1).map((bank) => (
            <div key={bank.name} className="bg-card border border-border rounded-lg p-3 sm:p-4 neon-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm sm:text-base text-foreground">{bank.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">STK: </span>
                  <span className="text-foreground font-mono text-[11px] sm:text-sm break-all">{bank.number}</span>
                </div>
                <button onClick={() => handleCopy(bank.number, bank.name)} className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] sm:text-xs shrink-0 ml-2">
                  {copiedField === bank.name ? <><CheckCircle className="w-3 h-3" /> Đã copy</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              {bank.holder && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Chủ TK: {bank.holder}</p>}
            </div>
          ))}
        </div>

        {/* Transfer Note */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card">
          <h3 className="font-bold text-sm sm:text-base text-foreground mb-3">Nội dung chuyển khoản</h3>
          {transferCode ? (
            <div className="bg-muted border border-primary/30 rounded-lg p-3 sm:p-4 flex items-center justify-between">
              <code className="text-primary font-mono text-base sm:text-lg font-bold">{transferCode}</code>
              <button onClick={() => handleCopy(transferCode, "content2")} className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] sm:text-xs shrink-0">
                {copiedField === "content2" ? <><CheckCircle className="w-3 h-3" /> Đã copy</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
          ) : (
            <div className="bg-muted border border-border rounded-lg p-3 sm:p-4 text-center">
              <p className="text-muted-foreground text-xs sm:text-sm">Vui lòng đăng nhập để xem mã nội dung chuyển khoản.</p>
            </div>
          )}
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-3">
            Mỗi tài khoản có một mã riêng. Vui lòng ghi đúng nội dung để hệ thống tự động cộng tiền.
          </p>
        </div>

        {/* Auto-Approve ATM Transfer */}
        {pendingAtmRequest && (
          <div className="bg-card border border-accent/30 rounded-xl p-4 sm:p-6 neon-card">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              <h3 className="font-bold text-sm sm:text-base text-foreground">Đã chuyển khoản?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Bạn có yêu cầu chờ xử lý. Nhập số tiền đã chuyển để hệ thống cộng tiền ngay.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">Số tiền đã chuyển (VNĐ)</label>
                <input
                  type="text"
                  value={atmAmount}
                  onChange={(e) => setAtmAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ví dụ: 50000"
                  className="w-full bg-muted border border-border rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all"
                />
                {atmAmount && (
                  <p className="text-[10px] sm:text-xs text-accent mt-2">
                    Bạn sẽ nhận: <span className="font-bold">{formatVND(
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Phê duyệt - Cộng tiền ngay</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Recent Top-up History */}
        {user && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 neon-card space-y-3 sm:space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground">Lịch sử nạp ATM</h3>
              </div>
              <Link to="/lich-su-nap" className="text-primary text-[10px] sm:text-xs font-semibold hover:underline">Xem tất cả</Link>
            </div>
            {loadingTopups ? (
              <div className="flex justify-center py-4 sm:py-6"><Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" /></div>
            ) : recentTopups.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">Chưa có lịch sử nạp ATM.</p>
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
