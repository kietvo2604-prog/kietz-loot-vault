import { Search, ShoppingCart, User, Gamepad2, ChevronDown, LogOut, Wallet, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import AnimatedLogo from "./AnimatedLogo";

const Header = () => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
        setIsAdmin(!!(data && data.length > 0));
      });
    });
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <Gamepad2 className="w-8 h-8 text-primary neon-text animate-spin-slow" />
            <AnimatedLogo />
          </a>

          {/* Search */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-muted border border-border rounded-lg py-2.5 pl-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all"
              />
              <button className="absolute right-1 top-1 bottom-1 px-3 gradient-primary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity">
                <Search className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="relative p-2 rounded-lg bg-muted hover:bg-border transition-colors">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-5 h-5 gradient-accent rounded-full text-xs flex items-center justify-center font-bold text-accent-foreground">
                0
              </span>
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg hover:bg-border transition-colors"
                >
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[200px] z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <a href="/lich-su?tab=balance" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Wallet className="w-4 h-4" /> Số dư
                    </a>
                    <a href="/lich-su" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <User className="w-4 h-4" /> Tài khoản
                    </a>
                    {isAdmin && (
                      <a href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-neon-orange hover:bg-muted transition-colors">
                        <Shield className="w-4 h-4" /> Admin Dashboard
                      </a>
                    )}
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/dang-nhap"
                className="flex items-center gap-2 px-4 py-2 gradient-primary rounded-lg font-semibold text-sm text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </a>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { name: "Trang chủ", href: "/" },
            { name: "Sản phẩm", href: "/#products" },
            { name: "Nạp tiền", href: "/nap-tien" },
            { name: "Đơn hàng", href: "#" },
            { name: "Lịch sử", href: "#", dropdown: true },
          ].map((item: any, i: number) => (
            item.dropdown ? (
              <div key={item.name} className="relative" ref={historyRef}>
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {item.name}
                  <ChevronDown className={`w-3 h-3 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                </button>
                {historyOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-50 animate-fade-in origin-top">
                    <a href="/lich-su?tab=purchases" onClick={() => setHistoryOpen(false)} className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      Lịch sử đơn hàng
                    </a>
                    <a href="/lich-su?tab=topups" onClick={() => setHistoryOpen(false)} className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      Nhật ký hoạt động
                    </a>
                    <a href="/lich-su?tab=balance" onClick={() => setHistoryOpen(false)} className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      Biến động số dư
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <a
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  i === 0
                    ? "gradient-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.name}
              </a>
            )
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
