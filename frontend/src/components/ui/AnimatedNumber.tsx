// src/components/ui/AnimatedNumber.tsx
"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number | string;
  duration?: number; // duration in ms
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedNumber({
  value,
  duration = 750,
  decimals,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedNumberProps) {
  // If string, try to parse numeric portion
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  const isValidNumber = !isNaN(numericValue) && isFinite(numericValue);

  const [displayValue, setDisplayValue] = useState<number>(() => (isValidNumber ? 0 : 0));
  const prevValueRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isValidNumber) return;

    // Check prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(numericValue);
      prevValueRef.current = numericValue;
      return;
    }

    const start = prevValueRef.current;
    const end = numericValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic curve: 1 - Math.pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        prevValueRef.current = end;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericValue, duration, isValidNumber]);

  if (!isValidNumber) {
    return <span className={className}>{value ?? "—"}</span>;
  }

  // Determine decimals if not explicitly provided
  const resolvedDecimals =
    decimals !== undefined
      ? decimals
      : String(numericValue).includes(".")
      ? String(numericValue).split(".")[1]?.length || 0
      : 0;

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
