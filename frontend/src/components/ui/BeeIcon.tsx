// src/components/ui/BeeIcon.tsx
"use client";

import React from "react";

interface BeeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  badge?: boolean;
}

/**
 * Geometric, architectural HoneyChain Bee Emblem.
 * Designed with precision 60°/120° hexagonal symmetry, faceted aeronautic wings,
 * mathematical abdomen segmentation, and subtle cryptographic badge frame.
 */
export function BeeIcon({
  size = 24,
  className = "",
  badge = false,
  ...props
}: BeeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {badge && (
        <>
          {/* Outer hexagonal shield */}
          <polygon
            points="24,2 43,13 43,35 24,46 5,35 5,13"
            stroke="#d69e1f"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            fill="#d69e1f"
            fillOpacity="0.08"
          />
          <polygon
            points="24,5 40.5,14.5 40.5,33.5 24,43 7.5,33.5 7.5,14.5"
            stroke="#d69e1f"
            strokeWidth="0.75"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
          />
        </>
      )}

      {/* Antennae with micro nodes */}
      <path
        d="M22 13.5C20.5 9.5 16.5 9 15 10.5"
        stroke="#d69e1f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M26 13.5C27.5 9.5 31.5 9 33 10.5"
        stroke="#d69e1f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="15" cy="10.5" r="1" fill="#f0c244" />
      <circle cx="33" cy="10.5" r="1" fill="#f0c244" />

      {/* Wings - Left Upper & Lower with Facet Veins */}
      <path
        d="M20 22L7 14.5C5.8 13.8 5 15.2 6 16.5L12 27L18.5 25.5Z"
        fill="#f0c244"
        fillOpacity="0.25"
        stroke="#d69e1f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M18 26L9 30.5C8 31 8.5 32.5 9.8 32.2L18.5 29.5Z"
        fill="#f0c244"
        fillOpacity="0.18"
        stroke="#d69e1f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 21L7.5 15.5"
        stroke="#d69e1f"
        strokeWidth="0.8"
        strokeOpacity="0.6"
      />
      <path
        d="M15 23.5L12 27"
        stroke="#d69e1f"
        strokeWidth="0.8"
        strokeOpacity="0.6"
      />

      {/* Wings - Right Upper & Lower with Facet Veins */}
      <path
        d="M28 22L41 14.5C42.2 13.8 43 15.2 42 16.5L36 27L29.5 25.5Z"
        fill="#f0c244"
        fillOpacity="0.25"
        stroke="#d69e1f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M30 26L39 30.5C40 31 39.5 32.5 38.2 32.2L29.5 29.5Z"
        fill="#f0c244"
        fillOpacity="0.18"
        stroke="#d69e1f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M36 21L40.5 15.5"
        stroke="#d69e1f"
        strokeWidth="0.8"
        strokeOpacity="0.6"
      />
      <path
        d="M33 23.5L36 27"
        stroke="#d69e1f"
        strokeWidth="0.8"
        strokeOpacity="0.6"
      />

      {/* Head */}
      <polygon
        points="21,14 27,14 28.5,18 26,20 22,20 19.5,18"
        fill="#d69e1f"
      />
      <circle cx="21" cy="16.5" r="0.8" fill="#17130e" />
      <circle cx="27" cy="16.5" r="0.8" fill="#17130e" />

      {/* Thorax (Hexagonal faceted center core) */}
      <polygon
        points="24,20 29.5,23.5 29.5,28.5 24,31.5 18.5,28.5 18.5,23.5"
        fill="#f0c244"
        stroke="#d69e1f"
        strokeWidth="1.2"
      />
      <polygon
        points="24,21 28,24 28,28 24,30.5 20,28 20,24"
        fill="#4a2e12"
        fillOpacity="0.3"
      />
      <line
        x1="24"
        y1="20"
        x2="24"
        y2="31.5"
        stroke="#d69e1f"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />

      {/* Abdomen (Mathematically tapered stripes) */}
      <path d="M19.5 32H28.5L27.5 34.5H20.5L19.5 32Z" fill="#d69e1f" />
      <path d="M20.5 35H27.5L26.5 37.5H21.5L20.5 35Z" fill="#4a2e12" />
      <path d="M21.5 38H26.5L25.5 40.5H22.5L21.5 38Z" fill="#d69e1f" />
      <polygon points="23,41 25,41 24,43.5" fill="#f0c244" />
    </svg>
  );
}

/**
 * Ambient, mathematical honeycomb lattice watermark.
 * Used for subtle architectural dashboard backgrounds and cryptographic panels.
 */
export function HoneycombMatrix({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 340 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="honeycomb-pattern"
          x="0"
          y="0"
          width="60"
          height="103.92"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z
               M30 103.92 L60 86.6 L60 51.96 L30 69.28 L0 51.96 L0 86.6 Z
               M30 0 L30 69.28"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#honeycomb-pattern)" />
    </svg>
  );
}

/**
 * Geometric, faceted honey drop icon with embedded hexagonal core.
 */
export function HoneyDropIcon({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5C12 2.5 5 11 5 15.5C5 19.0899 8.13401 22 12 22C15.866 22 19 19.0899 19 15.5C19 11 12 2.5 12 2.5Z"
        fill="#f0c244"
        fillOpacity="0.2"
        stroke="#d69e1f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polygon
        points="12,12 14.5,13.5 14.5,16.5 12,18 9.5,16.5 9.5,13.5"
        fill="#d69e1f"
        stroke="#4a2e12"
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

export default BeeIcon;
