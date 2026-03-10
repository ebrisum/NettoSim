import { useState, useEffect } from "react";

/**
 * Returns current window inner width; updates on resize.
 * Useful for responsive/mobile layout.
 */
export function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}
