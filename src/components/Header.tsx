import { Search, ShoppingCart, User, Gamepad2, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <Gamepad2 className="w-8 h-8 text-primary neon-text" />
            <h1 className="font-display text-xl md:text-2xl font-bold text-primary neon-text tracking-wider">
              ShopKietZ
            </h1>
          </div>

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
            <button className="flex items-center gap-2 px-4 py-2 gradient-primary rounded-lg font-semibold text-sm text-primary-foreground hover:opacity-90 transition-opacity">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { name: "Trang chủ", href: "/" },
            { name: "Sản phẩm", href: "/#products" },
            { name: "Nạp tiền", href: "/nap-tien" },
            { name: "Đơn hàng", href: "#" },
            { name: "Lịch sử", href: "/lich-su" },
          ].map((item, i) => (
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
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
