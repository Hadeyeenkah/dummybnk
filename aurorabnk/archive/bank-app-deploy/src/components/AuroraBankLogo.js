import React from 'react';

function AuroraBankLogo({ className = "h-10 w-10" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="20" cy="20" r="19" fill="url(#gradient)" opacity="0.15" stroke="currentColor" strokeWidth="1" />
      
      {/* Northern lights inspired aurora effect */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#22d3ee', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Wave/flow element - represents money movement */}
      <path
        d="M 8 20 Q 14 12, 20 16 T 32 18"
        stroke="url(#waveGradient)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Second wave - adds depth */}
      <path
        d="M 8 24 Q 14 18, 20 22 T 32 24"
        stroke="url(#waveGradient)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Shield outline - security */}
      <path
        d="M 20 8 L 28 12 L 28 20 C 28 26 20 32 20 32 C 20 32 12 26 12 20 L 12 12 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      
      {/* Check mark - trust/verification */}
      <g opacity="0.8">
        <path
          d="M 17 21 L 19 23 L 24 17"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default AuroraBankLogo;
