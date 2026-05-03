import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Gamepad2 } from "lucide-react";

const PageLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(15);

    const t1 = setTimeout(() => setProgress(60), 80);
    const t2 = setTimeout(() => setProgress(90), 250);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 200);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-transparent pointer-events-none">
        <div
          className="h-full gradient-primary transition-all duration-200 ease-out shadow-[0_0_10px_hsl(var(--primary))]"
          style={{
            width: `${progress}%`,
            opacity: loading ? 1 : 0,
          }}
        />
      </div>

      {/* Center overlay (only on initial loads) */}
      {loading && (
        <div className="fixed inset-0 z-[199] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <Gamepad2 className="w-12 h-12 text-primary animate-spin-slow neon-text" />
            <span className="text-xs font-semibold text-primary tracking-wider">ĐANG TẢI...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default PageLoader;
