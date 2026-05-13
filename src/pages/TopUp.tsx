import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Smartphone, Wallet, Gift, Copy, CheckCircle,
  AlertTriangle, ArrowRight, Loader2, Clock, XCircle, History
} from "lucide-react";
import { Link } from "react-router-dom";

const banks: { name: string; number: string; holder: string }[] = [
  { name: "MB Bank", number: "0987672604", holder: "VO ANH KIET" },
  { name: "BV Bank", number: "99ZP25275M36980652", holder: "ZALOPAY_VO ANH KIET" },
];

const cardTypes = [
  { id: "viettel", name: "Viettel", color: "text-red-400", serialLengths: [11, 14], codeLengths: [13, 15], serialHint: "11 hoặc 14 số", codeHint: "13 hoặc 15 số" },
  { id: "vinaphone", name: "Vinaphone", color: "text-blue-400", serialLengths: [14], codeLengths: [12, 14], serialHint: "14 số", codeHint: "12 hoặc 14 số" },
  { id: "mobifone", name: "Mobifone", color: "text-green-400", serialLengths: [15], codeLengths: [12], serialHint: "15 số", codeHint: "12 số" },
  { id: "garena", name: "Garena", color: "text-orange-400", serialLengths: [9], codeLengths: [9], serialHint: "9 số", codeHint: "9 số" },
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

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const TopUp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"card" | "atm">("card");
  const [selectedCard, setSelectedCard] = useState("viettel");
  const [selectedDenom, setSelectedDenom] = useState(100000);
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [errors, setErrors] = useState<{ serial?: string; code?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transferCode, setTransferCode] = useState<string | null>(null);
  const [recentTopups, setRecentTopups] = useState<TopupRequest[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [atmAmount, setAtmAmount] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [pendingAtmRequest, setPendingAtmRequest] = useState<TopupRequest | null>(null);
  const [sepayQrUrl, setSepayQrUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const currentCard = cardTypes.find((c) => c.id === selectedCard)!;

  // Fetch transfer code, QR code, and recent topups
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingTopups(true);
      setLoadingQr(true);
      try {
        const [profileRes, topupRes] = await Promise.all([
          supabase.from("profiles").select("transfer_code, bank_qr_code").eq("user_id", user.id).single(),
          supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        ]);
        
        const userTransferCode = profileRes.data?.transfer_code || null;
        setTransferCode(userTransferCode);
        setRecentTopups(topupRes.data || []);
        
        // Find pending ATM transfer
        const pendingAtm = (topupRes.data || []).find(
          (t) => t.status === "pending" && t.method.toLowerCase().includes("chuyển khoản")
        );
        setPendingAtmRequest(pendingAtm || null);
        
        // Generate QR URL directly using VietQR (free public API)
        // MB Bank ID: 970422, Account: 0987672604
        if (userTransferCode) {
          const qrUrl = `https://img.vietqr.io/image/970422-0987672604-compact2.png?addInfo=${encodeURIComponent(userTransferCode)}&accountName=${encodeURIComponent("VO ANH KIET")}`;
          setSepayQrUrl(qrUrl);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingTopups(false);
        setLoadingQr(false);
      }
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
          title: "❌ Lỗi",
          description: data?.error || "Không thể phê duyệt. Vui lòng thử lại.",
          variant: "destructive",
        });
        setApproveLoading(false);
        return;
      }

      toast({
        title: "✅ Đã phê duyệt tự �����ng",
        description: `Nạp ${formatVND(amount)} → Thực cộng ${formatVND(data.credit_amount)} (bonus ${data.bonus_rate})`,
      });

      setAtmAmount("");
      setPendingAtmRequest(null);

      // Refresh topups list
      const { data: newTopups } = await supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
      setRecentTopups(newTopups || []);
    } catch (err) {
      toast({
        title: "❌ Lỗi",
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

  const validateCard = () => {
    const newErrors: { serial?: string; code?: string } = {};
    const serialDigits = serial.replace(/\D/g, "");
    const codeDigits = code.replace(/\D/g, "");

    if (!serialDigits) {
      newErrors.serial = "Vui lòng nhập số Seri";
    } else if (!currentCard.serialLengths.includes(serialDigits.length)) {
      newErrors.serial = `Số Seri ${currentCard.name} phải có ${currentCard.serialHint}`;
    }

    if (!codeDigits) {
      newErrors.code = "Vui lòng nhập mã thẻ";
    } else if (!currentCard.codeLengths.includes(codeDigits.length)) {
      newErrors.code = `Mã thẻ ${currentCard.name} phải có ${currentCard.codeHint}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateCard()) return;
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", description: "Bạn cần đăng nhập để nạp thẻ.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const telcoMap: Record<string, string> = { viettel: "VIETTEL", vinaphone: "VINAPHONE", mobifone: "MOBIFONE", garena: "GARENA" };
    const telco = telcoMap[selectedCard];

    const { data: insertData, error: insertError } = await supabase.from("topup_requests").insert({
      user_id: user.id,
      amount: selectedDenom,
      method: `Thẻ cào ${currentCard.name}`,
      note: `Seri: ${serial} | Mã: ${code} | Mệnh giá: ${selectedDenom.toLocaleString("vi-VN")}đ`,
    }).select("id").single();

    if (insertError || !insertData) {
      setSubmitting(false);
      toast({ title: "Lỗi", description: "Không thể gửi yêu cầu. Vui lòng thử lại.", variant: "destructive" });
      return;
    }

    try {
      const { data: apiResult, error: apiError } = await supabase.functions.invoke("charge-card", {
        body: { telco, code, serial, amount: selectedDenom, user_id: user.id, topup_request_id: insertData.id },
      });

      if (apiError) {
        toast({ title: "⚠️ Đã gửi thẻ", description: "Thẻ đang được xử lý tự động. Vui lòng chờ kết quả." });
      } else {
        toast({ title: "✅ Đã gửi thẻ cào", description: `Thẻ ${currentCard.name} mệnh giá ${formatVND(selectedDenom)} đang được xử lý tự động.` });
      }
      setSuccessMessage(`✅ Thẻ ${currentCard.name} mệnh giá ${formatVND(selectedDenom)} đang được hệ thống xử lý tự động.`);
    } catch (err) {
      toast({ title: "⚠️ Đã gửi thẻ", description: "Thẻ đang được xử lý. Vui lòng kiểm tra lịch sử nạp tiền." });
      setSuccessMessage(`⏳ Thẻ ${currentCard.name} đã gửi. Vui lòng kiểm tra trạng thái trong lịch sử nạp tiền.`);
    }

    // Refresh recent topups
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
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {successMessage && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">{successMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">Bạn có thể kiểm tra trạng thái trong lịch sử nạp tiền.</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
        )}

        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary neon-text text-center">NẠP TIỀN VÀO TÀI KHOẢN</h1>
        <p className="text-center text-muted-foreground text-sm">Chọn hình thức nạp tiền phù hợp — Tự động 24/7</p>

        {/* Tabs */}
        <div className="flex gap-2 justify-center">
          <button onClick={() => setTab("card")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${tab === "card" ? "gradient-primary text-primary-foreground neon-border" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"}`}>
            <Smartphone className="w-4 h-4" /> Thẻ Cào
          </button>
          <button onClick={() => setTab("atm")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${tab === "atm" ? "gradient-primary text-primary-foreground neon-border" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"}`}>
            <Wallet className="w-4 h-4" /> ATM / Ví Điện Tử
            <span className="gradient-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">+10%</span>
          </button>
        </div>

        {/* Card Tab */}
        {tab === "card" && (
          <div className="bg-card border border-border rounded-xl p-6 neon-card animate-slide-up space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-6 h-6 text-neon-cyan" />
              <h2 className="font-display text-lg font-bold text-secondary neon-cyan-text">NẠP QUA THẺ CÀO</h2>
              <span className="gradient-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">-20% chiết khấu</span>
            </div>

            {/* Card Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Chọn loại thẻ</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {cardTypes.map((ct) => (
                  <button key={ct.id} onClick={() => { setSelectedCard(ct.id); setSerial(""); setCode(""); setErrors({}); }}
                    className={`py-3 rounded-lg font-semibold text-sm border transition-all ${selectedCard === ct.id ? "border-primary bg-primary/10 text-primary neon-border" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                    {ct.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Denomination */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Mệnh giá</label>
              <div className="grid grid-cols-3 gap-2">
                {denominations.map((d) => (
                  <button key={d} onClick={() => setSelectedDenom(d)}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${selectedDenom === d ? "border-primary bg-primary/10 text-primary neon-border" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                    {formatVND(d)}
                  </button>
                ))}
              </div>
            </div>

            {/* Serial & Code */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Số Seri</label>
                <p className="text-xs text-muted-foreground mb-2">{currentCard.name}: {currentCard.serialHint}</p>
                <input type="text" value={serial}
                  onChange={(e) => { setSerial(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, serial: undefined })); }}
                  placeholder={`Nhập số Seri (${currentCard.serialHint})...`}
                  maxLength={Math.max(...currentCard.serialLengths)}
                  className={`w-full bg-muted border rounded-lg py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.serial ? "border-destructive" : "border-border"}`} />
                {errors.serial && <p className="text-xs text-destructive mt-1">{errors.serial}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Mã thẻ</label>
                <p className="text-xs text-muted-foreground mb-2">{currentCard.name}: {currentCard.codeHint}</p>
                <input type="text" value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, code: undefined })); }}
                  placeholder={`Nhập mã thẻ (${currentCard.codeHint})...`}
                  maxLength={Math.max(...currentCard.codeLengths)}
                  className={`w-full bg-muted border rounded-lg py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.code ? "border-destructive" : "border-border"}`} />
                {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">Vui lòng nhập đúng mệnh giá thẻ cào. Nhập sai mệnh giá sẽ bị mất thẻ và không được hoàn tiền.</p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center text-sm">
              <span className="text-muted-foreground">Mệnh giá: {formatVND(selectedDenom)} → Thực nhận: </span>
              <span className="text-primary font-bold">{formatVND(selectedDenom * 0.8)}</span>
              <span className="text-destructive text-xs ml-1">(-20%)</span>
            </div>

            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3.5 gradient-primary text-primary-foreground font-bold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi yêu cầu...</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Nạp thẻ — Thực nhận {formatVND(selectedDenom * 0.8)} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}

        {/* ATM Tab */}
        {tab === "atm" && (
          <div className="space-y-6 animate-slide-up">
            <div className="gradient-accent rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-accent-foreground" />
                <div>
                  <p className="font-bold text-accent-foreground">ƯU ĐÃI KHI NẠP ATM</p>
                  <p className="text-sm text-accent-foreground/80">Nạp dưới 50k → +10% bonus. Từ 50k trở lên → +5% bonus!</p>
                </div>
              </div>
              <span className="font-display text-2xl font-bold text-accent-foreground">+10%</span>
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl overflow-hidden shadow-lg">
              <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-600/30">
                <AlertTriangle className="w-5 h-5 text-white" />
                <span className="font-bold text-white">Lưu ý quan trọng</span>
              </div>
              <div className="bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-800 mb-1">Vui lòng đọc kỹ trước khi nạp</p>
                <ul className="space-y-1 text-sm text-amber-900">
                  <li>Nhập đúng nội dung chuyển tiền.</li>
                  <li>Cộng tiền trong vài giây. <span className="font-bold">Min 10k</span></li>
                  <li>Liên hệ ZALO <span className="font-bold">0987672604</span> nếu nhập sai nội dung chuyển hoặc tiền không tự cộng sau 1 phút.</li>
                </ul>
              </div>
            </div>

            {/* Bank accounts */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-neon-cyan" />
                <h2 className="font-display text-lg font-bold text-secondary neon-cyan-text">CHUYỂN KHOẢN NGÂN HÀNG</h2>
              </div>
              <div className="space-y-3">
                {/* MB Bank with Sepay QR */}
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-xl overflow-hidden shadow-lg">
                  {/* Bank Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">MB Bank</h3>
                      <p className="text-blue-100 text-xs">VO ANH KIET</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-white p-6 space-y-4">
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center">
                      {loadingQr ? (
                        <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded-lg">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      ) : sepayQrUrl ? (
                        <img 
                          src={sepayQrUrl} 
                          alt="MB Bank Sepay QR" 
                          className="w-56 h-56 rounded-lg border-2 border-gray-200 object-contain" 
                        />
                      ) : (
                        <div className="w-56 h-56 bg-gray-100 rounded-lg flex items-center justify-center p-4">
                          <p className="text-center text-sm text-gray-500">Vui lòng đăng nhập để xem mã QR</p>
                        </div>
                      )}
                    </div>

                    {/* Account Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                        <span className="text-gray-600">Số tài khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">0987672604</span>
                          <button 
                            onClick={() => handleCopy("0987672604", "MB Bank")} 
                            className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
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
                          <p className="text-xs text-gray-600 mb-1">NỘI DUNG CHUYỂN KHOẢN</p>
                          <div className="flex items-center justify-between">
                            <code className="font-bold text-red-600 text-sm">{transferCode}</code>
                            <button 
                              onClick={() => handleCopy(transferCode, "content")} 
                              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
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

                {/* Other banks */}
                {banks.slice(1).map((bank) => (
                  <div key={bank.name} className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-foreground">{bank.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">STK: </span>
                        <span className="text-foreground font-mono">{bank.number}</span>
                      </div>
                      <button onClick={() => handleCopy(bank.number, bank.name)} className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs justify-end">
                        {copiedField === bank.name ? <><CheckCircle className="w-3 h-3" /> Đã copy</> : <><Copy className="w-3 h-3" /> Copy STK</>}
                      </button>
                    </div>
                    {bank.holder && <p className="text-xs text-muted-foreground mt-1">Chủ TK: {bank.holder}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer note with unique code */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card">
              <h3 className="font-bold text-foreground mb-3">📌 Nội dung chuyển khoản</h3>
              {transferCode ? (
                <div className="bg-muted border border-primary/30 rounded-lg p-4 flex items-center justify-between">
                  <code className="text-primary font-mono text-lg font-bold">{transferCode}</code>
                  <button onClick={() => handleCopy(transferCode, "content")} className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs">
                    {copiedField === "content" ? <><CheckCircle className="w-3 h-3" /> Đã copy</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              ) : (
                <div className="bg-muted border border-border rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm">Vui lòng đăng nhập để xem mã nội dung chuyển khoản của bạn.</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                ⚠️ Mỗi tài khoản có một mã riêng. Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự động cộng tiền.
              </p>
            </div>

            {/* Auto-Approve ATM Transfer */}
            {pendingAtmRequest && (
              <div className="bg-card border border-accent/30 rounded-xl p-6 neon-card">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-accent" />
                  <h3 className="font-bold text-foreground">⚡ Đã chuyển khoản?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Bạn có yêu cầu chuyển khoản ATM đang chờ xử lý. Hãy nhập số tiền bạn đã chuyển để hệ thống tự động phê duyệt và cộng tiền ngay lập tức.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Số tiền đã chuyển (VNĐ)</label>
                    <input
                      type="text"
                      value={atmAmount}
                      onChange={(e) => setAtmAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ví dụ: 50000"
                      className="w-full bg-muted border border-border rounded-lg py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all"
                    />
                    {atmAmount && (
                      <p className="text-xs text-accent mt-2">
                        💰 Bạn sẽ nhận: <span className="font-bold">{formatVND(
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
                    className="w-full py-3 gradient-accent text-accent-foreground font-bold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {approveLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Phê duyệt tự động → Cộng tiền ngay</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Successful ATM Transfers History */}
        {user && (() => {
          const successfulAtmTransfers = recentTopups.filter(
            (t) => t.status === "approved" && t.method.toLowerCase().includes("chuyển khoản")
          );
          if (successfulAtmTransfers.length === 0) return null;
          return (
            <div className="bg-card border border-primary/30 rounded-xl p-6 neon-card space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Lịch sử chuyển khoản ATM thành công</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary">
                    {successfulAtmTransfers.length} giao dịch
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {successfulAtmTransfers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.method}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("vi-VN")}</p>
                        {t.note && (
                          <p className="text-[10px] text-primary/80 mt-0.5 truncate max-w-[200px]">{t.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-primary">+{formatVND(t.amount)}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 border-primary/30 text-primary">
                        <CheckCircle className="w-3 h-3" /> Thành công
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Recent Top-up History */}
        {user && (
          <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Lịch sử nạp gần đây</h3>
              </div>
              <Link to="/lich-su-nap" className="text-primary text-xs font-semibold hover:underline">Xem tất cả →</Link>
            </div>
            {loadingTopups ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : recentTopups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có lịch sử nạp tiền.</p>
            ) : (
              <div className="space-y-2">
                {recentTopups.map((t) => (
                  <div key={t.id} className={`flex items-center justify-between py-3 px-3 rounded-lg border ${t.status === "approved" ? "border-primary/20" : t.status === "rejected" ? "border-destructive/20" : "border-border"} bg-muted/30`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.status === "approved" ? "bg-primary/10" : t.status === "rejected" ? "bg-destructive/10" : "bg-accent/10"}`}>
                        {t.status === "approved" ? <CheckCircle className="w-4 h-4 text-primary" /> : t.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-accent" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.method}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${t.status === "approved" ? "text-primary" : t.status === "rejected" ? "text-destructive line-through" : "text-accent"}`}>
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

export default TopUp;
