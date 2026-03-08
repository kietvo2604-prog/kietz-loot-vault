import { useState, useEffect, useCallback } from "react";

const FULL_TEXT = "ShopKietZ";

const AnimatedLogo = () => {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [doneTyping, setDoneTyping] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(interval);
        setDoneTyping(true);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor((p) => !p), 530);
    return () => clearInterval(blink);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 500);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newSparkles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 30,
    }));
    setSparkles((prev) => [...prev, ...newSparkles]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => !newSparkles.find((n) => n.id === s.id)));
    }, 700);
  }, []);

  return (
    <div
      className={`flex flex-col items-start leading-none select-none cursor-pointer relative ${bouncing ? "logo-bounce" : ""}`}
      onClick={handleClick}
    >
      <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase text-primary/70">
        Shop Acc Uy Tín Nhất
      </span>
      <h1 className="font-display text-xl md:text-2xl font-bold tracking-wider relative">
        <span className="neon-text text-primary">
          {displayed}
        </span>
        <span
          className={`inline-block w-[2px] h-[1.1em] bg-primary ml-0.5 align-middle transition-opacity duration-100 ${
            showCursor ? "opacity-100" : "opacity-0"
          } ${doneTyping ? "animate-pulse-neon" : ""}`}
        />
      </h1>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="logo-sparkle"
          style={{ left: s.x, top: s.y }}
        />
      ))}
    </div>
  );
};

export default AnimatedLogo;
