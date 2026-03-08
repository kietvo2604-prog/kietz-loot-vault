import { useEffect, useCallback } from "react";

const ClickSparkle = () => {
  const handleClick = useCallback((e: MouseEvent) => {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement("span");
      sparkle.className = "click-sparkle";
      const angle = (360 / count) * i + (Math.random() - 0.5) * 30;
      const distance = 20 + Math.random() * 25;
      const rad = (angle * Math.PI) / 180;
      const tx = Math.cos(rad) * distance;
      const ty = Math.sin(rad) * distance;
      sparkle.style.left = `${e.clientX}px`;
      sparkle.style.top = `${e.clientY}px`;
      sparkle.style.setProperty("--tx", `${tx}px`);
      sparkle.style.setProperty("--ty", `${ty}px`);
      document.body.appendChild(sparkle);
      sparkle.addEventListener("animationend", () => sparkle.remove());
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  return null;
};

export default ClickSparkle;
