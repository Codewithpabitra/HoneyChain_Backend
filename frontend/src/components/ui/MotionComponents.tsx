// src/components/ui/MotionComponents.tsx
"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function StaggerContainer({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerItemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  enableHoverLift?: boolean;
}

export function MotionCard({
  children,
  className,
  enableHoverLift = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={enableHoverLift ? { y: -2, transition: { duration: 0.2 } } : undefined}
      whileTap={enableHoverLift ? { scale: 0.995 } : undefined}
      className={cn("transition-shadow duration-200", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface LivePulseProps {
  color?: "emerald" | "amber" | "rose" | "blue";
  size?: "sm" | "md";
  className?: string;
}

export function LivePulse({
  color = "emerald",
  size = "sm",
  className,
}: LivePulseProps) {
  const colorMap = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    blue: "bg-blue-500",
  };

  const pingMap = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    blue: "bg-blue-400",
  };

  const sizeMap = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
  };

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          pingMap[color],
          sizeMap[size]
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full",
          colorMap[color],
          sizeMap[size]
        )}
      />
    </span>
  );
}
