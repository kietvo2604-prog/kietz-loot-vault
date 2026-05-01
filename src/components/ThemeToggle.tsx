import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      // Default: light
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-border transition-colors"
      title={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-neon-orange" />
      ) : (
        <Moon className="w-4 h-4 text-foreground" />
      )}
    </button>
  );
};

export default ThemeToggle;
