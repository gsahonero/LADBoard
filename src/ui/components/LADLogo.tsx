import React from 'react';

interface LADLogoProps {
  size?: number;
  className?: string;
  variant?: 'badge' | 'icon' | 'mark';
}

export const LADLogo: React.FC<LADLogoProps> = ({
  size = 36,
  className = '',
  variant = 'badge',
}) => {
  const content = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background rounded squircle gradient */}
        <linearGradient id="ladBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Living active ribbon gradient */}
        <linearGradient id="ladRibbonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Dynamic star & spark accent */}
        <linearGradient id="ladStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Pencil body gradient */}
        <linearGradient id="ladPencilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Ambient Glow */}
        <filter id="ladGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {variant === 'badge' && (
        <>
          {/* Outer Squircle Container */}
          <rect
            width="120"
            height="120"
            rx="30"
            fill="url(#ladBgGrad)"
          />
          {/* Subtle Inner Border Glow */}
          <rect
            x="1"
            y="1"
            width="118"
            height="118"
            rx="29"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
          />
        </>
      )}

      {/* 1. Dynamic Gear Segment (representing "Dynamic" & System Orchestration) */}
      <g opacity="0.32" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {/* Gear Teeth Arcs */}
        <path d="M 42 28 A 26 26 0 0 1 78 28" strokeDasharray="4 6" strokeWidth="4" />
        <path d="M 28 42 A 26 26 0 0 0 28 78" strokeDasharray="4 6" strokeWidth="4" />
      </g>

      {/* 2. Living Flow Wave (representing "Living" biological flow and organic note curves) */}
      <path
        d="M 28 84 C 42 98, 68 96, 78 78 C 86 64, 82 46, 68 40 C 56 34, 46 44, 44 54 C 42 66, 52 76, 66 74 C 84 72, 94 54, 92 36"
        stroke="url(#ladRibbonGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ladGlow)"
      />

      {/* 3. Active Forward Momentum Arrow (terminating the living loop) */}
      <path
        d="M 85 36 L 93 35 L 94 44"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Stylized Writing Pencil / Stylus (drawing the dynamic curve) */}
      <g transform="translate(30, 72) rotate(-42)">
        {/* Pencil Body */}
        <path
          d="M 0 -6 L 24 -6 L 24 6 L 0 6 Z"
          fill="url(#ladPencilGrad)"
          rx="1"
        />
        {/* Pencil Tip (Cone) */}
        <path
          d="M 0 -6 L -10 0 L 0 6 Z"
          fill="#F8FAFC"
        />
        {/* Graphite Nib Point touching the curve */}
        <path
          d="M -6 -2.4 L -10 0 L -6 2.4 Z"
          fill="#1E293B"
        />
        {/* Stylus Band */}
        <line x1="16" y1="-6" x2="16" y2="6" stroke="#94A3B8" strokeWidth="1.5" />
      </g>

      {/* 5. Radiant Spark / Star (representing Insight, Clarity & Dynamic Intelligence) */}
      <g transform="translate(74, 30)">
        <path
          d="M 0 -12 C 0 -3.5, 3.5 0, 12 0 C 3.5 0, 0 3.5, 0 12 C 0 3.5, -3.5 0, -12 0 C -3.5 0, 0 -3.5, 0 -12 Z"
          fill="url(#ladStarGrad)"
        />
        <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
      </g>

      {/* 6. Minor Harmonizing Ambient Sparkle */}
      <g transform="translate(34, 36) scale(0.55)">
        <path
          d="M 0 -10 C 0 -3, 3 0, 10 0 C 3 0, 0 3, 0 10 C 0 3, -3 0, -10 0 C -3 0, 0 -3, 0 -10 Z"
          fill="#FFFFFF"
          opacity="0.85"
        />
      </g>
    </svg>
  );

  return content;
};
