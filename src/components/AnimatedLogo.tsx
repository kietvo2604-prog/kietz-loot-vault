import { useState, useEffect } from "react";

const FULL_TEXT = "ShopKietZ";

const AnimatedLogo = () => {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [doneTyping, setDoneTyping] = useState(false);

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

  return (
    <div className="flex flex-col items-start leading-none select-none">
      <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase text-neon-orange">
        Shop Acc Uy Tín Nhất
      </span>
      <h1 className="font-display text-xl md:text-2xl font-bold tracking-wider relative">
        <span className="logo-gradient-text">
          {displayed}
        </span>
        <span
          className={`inline-block w-[2px] h-[1.1em] bg-neon-orange ml-0.5 align-middle transition-opacity duration-100 ${
            showCursor ? "opacity-100" : "opacity-0"
          } ${doneTyping ? "animate-pulse-neon" : ""}`}
        />
      </h1>
    </div>
  );
};

export default AnimatedLogo;
