import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Wallet, Lock, Loader2, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/dang-nhap"); return; }
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      setProfile(data);
      setDisplayName(data?.display_name || "");
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: "✅ Đã cập nhật thông tin!" });
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/dang-nhap",
    });
    setResetSending(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi link đổi mật khẩu!", description: "Kiểm tra email của bạn." });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <h1 className="font-display text-2xl font-bold text-primary neon-text text-center">TRANG CÁ NHÂN</h1>

        <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-5 animate-slide-up">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {(displayName || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" /> Tên hiển thị
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email
              </label>
              <input
                value={user.email || ""}
                disabled
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-muted-foreground text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-muted-foreground" /> Số dư
              </label>
              <div className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-primary font-bold text-sm">
                {profile ? formatVND(profile.balance) : "0đ"}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded-xl p-6 neon-card space-y-4 animate-slide-up">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> Đổi mật khẩu
          </h2>
          <p className="text-sm text-muted-foreground">
            Nhấn nút bên dưới để nhận link đổi mật khẩu qua email <strong>{user.email}</strong>.
          </p>
          <button
            onClick={handleResetPassword}
            disabled={resetSending}
            className="w-full py-2.5 bg-muted border border-border text-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {resetSending ? "Đang gửi..." : "Gửi link đổi mật khẩu"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
