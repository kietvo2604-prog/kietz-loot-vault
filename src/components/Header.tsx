import { Search, ShoppingCart, User, Gamepad2, ChevronDown, LogOut, Wallet, Shield, Phone, Mail, CreditCard, History, FileText, HelpCircle, Home, Package } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "./ThemeToggle";
import AnimatedLogo from "./AnimatedLogo";

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCTV, setIsCTV] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setIsCTV(false); setBalance(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(!!(data && data.length > 0));
    });
    supabase.from("ctv_assignments").select("id").eq("is_active", true).then(({ data }) => {
      setIsCTV(!!(data && data.length > 0));
    });
    supabase.from("profiles").select("balance").eq("user_id", user.id).single().then(({ data }) => {
      setBalance(data?.balance ?? 0);
    });
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const navItems = [
    { name: "Trang chủ", href: "/", match: "/", icon: <Home className="w-4 h-4" /> },
    { name: "Nạp tiền", href: "/nap-tien", match: "/nap-tien", icon: <CreditCard className="w-4 h-4" /> },
    { name: "Lịch sử nạp", href: "/lich-su-nap", match: "/lich-su-nap", icon: <Wallet className="w-4 h-4" /> },
    { name: "Lịch sử mua", href: "/lich-su-mua", match: "/lich-su-mua", icon: <ShoppingCart className="w-4 h-4" /> },
    { name: "Biến động số dư", href: "/bien-dong-so-du", match: "/bien-dong-so-du", icon: <FileText className="w-4 h-4" /> },
    { name: "Quy định nạp thẻ", href: "/quy-dinh-nap-the", match: "/quy-dinh-nap-the", icon: <FileText className="w-4 h-4" /> },
    { name: "FAQ", href: "/faq", match: "/faq", icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://discord.gg/shopkietz" target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> Discord: dsc.gg/shopkietz
            </a>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="w-3 h-3" /> support@shopkietz.com
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <Gamepad2 className="w-10 h-10 text-primary neon-text animate-spin-slow" />
            <AnimatedLogo />
          </a>

          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-muted border border-border rounded-lg py-2.5 pl-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all" />
              <button type="submit" className="absolute right-1 top-1 bottom-1 px-3 gradient-primary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity">
                <Search className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg hover:bg-border transition-colors">
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {balance !== null && (
                        <div className="mt-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5">
                          <p className="text-xs font-bold text-primary">💰 Số dư: {balance.toLocaleString("vi-VN")}đ</p>
                        </div>
                      )}
                    </div>
                    <a href="/trang-ca-nhan" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <User className="w-4 h-4" /> Trang cá nhân
                    </a>
                    <a href="/lich-su-mua" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <ShoppingCart className="w-4 h-4" /> Đơn hàng của tôi
                    </a>
                    <a href="/lich-su" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Wallet className="w-4 h-4" /> Lịch sử giao dịch
                    </a>
                    <a href="/nap-tien" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <CreditCard className="w-4 h-4" /> Nạp tiền
                    </a>
                    {isAdmin && (
                      <a href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-neon-orange hover:bg-muted transition-colors">
                        <Shield className="w-4 h-4" /> Admin Dashboard
                      </a>
                    )}
                    <div className="border-t border-border mt-1">
                      <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors">
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a href="/dang-nhap" className="flex items-center gap-2 px-4 py-2 gradient-primary rounded-lg font-semibold text-sm text-primary-foreground hover:opacity-90 transition-opacity">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </a>
            )}
          </div>
        </div>

        {/* Simple flat nav - no dropdowns */}
        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isActive = item.match === "/" ? currentPath === "/" : currentPath.startsWith(item.match);
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
