import { useState } from "react";
import zalopayQR from "@/assets/zalopay-qr.png";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Wallet, Gift, Copy, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const banks = [
  { name: "BV Bank", number: "99ZP25275M36980652", holder: "ZALOPAY_VO ANH KIET" },
];

const eWallets = [
  { name: "ZaloPay", number: "0987672604", holder: "VO ANH KIET", hasQR: true },
];

const cardTypes = [
  { id: "viettel", name: "Viettel", color: "text-red-400", serialLengths: [11, 14], codeLengths: [13, 15], serialHint: "11 hoặc 14 số", codeHint: "13 hoặc 15 số" },
  { id: "vinaphone", name: "Vinaphone", color: "text-blue-400", serialLengths: [14], codeLengths: [12, 14], serialHint: "14 số", codeHint: "12 hoặc 14 số" },
  { id: "mobifone", name: "Mobifone", color: "text-green-400", serialLengths: [15], codeLengths: [12], serialHint: "15 số", codeHint: "12 số" },
];

const denominations = [10000, 20000, 50000, 100000, 200000, 500000];

const TopUp = () => {
  const [tab, setTab] = useState<"card" | "atm">("card");
  const [selectedCard, setSelectedCard] = useState("viettel");
  const [selectedDenom, setSelectedDenom] = useState(100000);
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [errors, setErrors] = useState<{ serial?: string; code?: string }>({});

  const currentCard = cardTypes.find((c) => c.id === selectedCard)!;

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

  const handleSubmit = () => {
    if (!validateCard()) return;
    // TODO: submit topup request
  };

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary neon-text text-center">
          NẠP TIỀN VÀO TÀI KHOẢN
        </h1>
        <p className="text-center text-muted-foreground text-sm">
          Chọn hình thức nạp tiền phù hợp — Tự động 24/7
        </p>

        {/* Tabs */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setTab("card")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              tab === "card"
                ? "gradient-primary text-primary-foreground neon-border"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Thẻ Cào
          </button>
          <button
            onClick={() => setTab("atm")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              tab === "atm"
                ? "gradient-primary text-primary-foreground neon-border"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"
            }`}
          >
            <Wallet className="w-4 h-4" />
            ATM / Ví Điện Tử
            <span className="gradient-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              +100%
            </span>
          </button>
        </div>

        {/* Card Tab */}
        {tab === "card" && (
           <div className="bg-card border border-border rounded-xl p-6 neon-card animate-slide-up space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-6 h-6 text-neon-cyan" />
              <h2 className="font-display text-lg font-bold text-secondary neon-cyan-text">NẠP QUA THẺ CÀO</h2>
              <span className="gradient-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                -20% chiết khấu
              </span>
            </div>

            {/* Card Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Chọn loại thẻ</label>
              <div className="flex gap-2">
                {cardTypes.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => { setSelectedCard(ct.id); setSerial(""); setCode(""); setErrors({}); }}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm border transition-all ${
                      selectedCard === ct.id
                        ? "border-primary bg-primary/10 text-primary neon-border"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                    }`}
                  >
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
                  <button
                    key={d}
                    onClick={() => setSelectedDenom(d)}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                      selectedDenom === d
                        ? "border-primary bg-primary/10 text-primary neon-border"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                    }`}
                  >
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
                <input
                  type="text"
                  value={serial}
                  onChange={(e) => { setSerial(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, serial: undefined })); }}
                  placeholder={`Nhập số Seri (${currentCard.serialHint})...`}
                  maxLength={Math.max(...currentCard.serialLengths)}
                  className={`w-full bg-muted border rounded-lg py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.serial ? "border-destructive" : "border-border"}`}
                />
                {errors.serial && <p className="text-xs text-destructive mt-1">{errors.serial}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Mã thẻ</label>
                <p className="text-xs text-muted-foreground mb-2">{currentCard.name}: {currentCard.codeHint}</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErrors((prev) => ({ ...prev, code: undefined })); }}
                  placeholder={`Nhập mã thẻ (${currentCard.codeHint})...`}
                  maxLength={Math.max(...currentCard.codeLengths)}
                  className={`w-full bg-muted border rounded-lg py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all ${errors.code ? "border-destructive" : "border-border"}`}
                />
                {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Vui lòng nhập đúng mệnh giá thẻ cào. Nhập sai mệnh giá sẽ bị mất thẻ và không được hoàn tiền.
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center text-sm">
              <span className="text-muted-foreground">Mệnh giá: {formatVND(selectedDenom)} → Thực nhận: </span>
              <span className="text-primary font-bold">{formatVND(selectedDenom * 0.8)}</span>
              <span className="text-destructive text-xs ml-1">(-20%)</span>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} className="w-full py-3.5 gradient-primary text-primary-foreground font-bold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              Nạp thẻ — Thực nhận {formatVND(selectedDenom * 0.8)}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ATM Tab */}
        {tab === "atm" && (
          <div className="space-y-6 animate-slide-up">
            {/* Bonus banner */}
            <div className="gradient-accent rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-accent-foreground" />
                <div>
                  <p className="font-bold text-accent-foreground">ƯU ĐÃI ĐẶC BIỆT</p>
                  <p className="text-sm text-accent-foreground/80">Nạp qua ATM/Ví điện tử nhận 100% giá trị — không chiết khấu!</p>
                </div>
              </div>
              <span className="font-display text-2xl font-bold text-accent-foreground">100%</span>
            </div>

            {/* Bank accounts */}
            {/* E-wallets - moved up */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-4">
              <div className="flex items-center gap-2 justify-center">
                <Smartphone className="w-6 h-6 text-neon-cyan" />
                <h2 className="font-display text-lg font-bold text-secondary neon-cyan-text">VÍ ĐIỆN TỬ</h2>
              </div>

              <div className="flex flex-col items-center gap-3">
                {eWallets.map((w: any) => (
                  <div key={w.name} className="bg-muted border border-border rounded-lg p-4 text-center">
                    <p className="font-bold text-foreground mb-1">{w.name}</p>
                    {w.hasQR && (
                      <div className="my-3 flex justify-center">
                        <img src={zalopayQR} alt="ZaloPay QR" className="w-64 h-64 rounded-lg border border-border object-contain bg-white" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-mono">{w.number || "Chưa cập nhật"}</span>
                      {w.number && (
                        <button
                          onClick={() => handleCopy(w.number, w.name)}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs"
                        >
                          {copiedField === w.name ? (
                            <><CheckCircle className="w-3 h-3" /> Đã copy</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy</>
                          )}
                        </button>
                      )}
                    </div>
                    {w.holder && <p className="text-xs text-muted-foreground mt-1">Chủ TK: {w.holder}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Bank accounts - moved down */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-neon-cyan" />
                <h2 className="font-display text-lg font-bold text-secondary neon-cyan-text">CHUYỂN KHOẢN NGÂN HÀNG</h2>
              </div>

              <div className="space-y-3">
                {banks.map((bank) => (
                  <div key={bank.name} className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-foreground">{bank.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">STK: </span>
                        <span className="text-foreground font-mono">{bank.number || "Chưa cập nhật"}</span>
                      </div>
                      {bank.number && (
                        <button
                          onClick={() => handleCopy(bank.number, bank.name)}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs justify-end"
                        >
                          {copiedField === bank.name ? (
                            <><CheckCircle className="w-3 h-3" /> Đã copy</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy STK</>
                          )}
                        </button>
                      )}
                    </div>
                    {bank.holder && <p className="text-xs text-muted-foreground mt-1">Chủ TK: {bank.holder}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer note */}
            <div className="bg-card border border-border rounded-xl p-6 neon-card">
              <h3 className="font-bold text-foreground mb-3">📌 Nội dung chuyển khoản</h3>
              <div className="bg-muted border border-primary/30 rounded-lg p-4 flex items-center justify-between">
                <code className="text-primary font-mono text-sm font-bold">NAP [TÊN ĐĂNG NHẬP]</code>
                <button
                  onClick={() => handleCopy("NAP [TÊN ĐĂNG NHẬP]", "content")}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs"
                >
                  {copiedField === "content" ? (
                    <><CheckCircle className="w-3 h-3" /> Đã copy</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ⚠️ Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự động cộng tiền. Sai nội dung sẽ phải liên hệ Admin để xử lý thủ công.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TopUp;
