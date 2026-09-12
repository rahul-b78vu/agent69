import React from 'react';

export const InstitutionalHeader: React.FC = () => {
  return (
    <div className="bg-white border-b border-slate-200/90 px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 shadow-xs flex items-center justify-between gap-2 sm:gap-4 select-none z-40 relative overflow-hidden">
      {/* Ambient background glow in center */}
      <div className="absolute left-1/2 -top-10 -translate-x-1/2 w-96 h-28 bg-gradient-to-b from-blue-400/10 via-indigo-400/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Left: Vignan's University Official Vector Logo (Animated Breathe & Larger Size) */}
      <div className="flex items-center shrink-0">
        <img
          src="/vignan-logo.svg"
          alt="Vignan's Foundation for Science, Technology & Research"
          className="h-13 sm:h-15 md:h-17 lg:h-20 max-h-[82px] w-auto object-contain animate-logo-breathe hover:scale-105 transition-transform duration-300 cursor-pointer"
        />
      </div>

      {/* Middle: AGENT 69 with Animated Radar Emblem & High-Tech Styling */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 sm:px-3 py-0.5 group min-w-0">
        {/* Top Middle: Animated Radar Emblem + Futuristic Pill Badge */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="relative flex items-center justify-center">
            {/* Ambient pulse glow */}
            <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-400/35 rounded-full blur-md animate-pulse pointer-events-none" />
            
            {/* High-Tech Animated Vector Radar Shield Emblem (Larger & Brighter) */}
            <svg
              className="w-7 h-7 sm:w-9 sm:h-9 animate-emblem-glow drop-shadow-md relative z-10"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Clockwise Rotating Tick Ring */}
              <circle
                cx="24"
                cy="24"
                r="21"
                stroke="url(#agentRingGrad1)"
                strokeWidth="1.6"
                strokeDasharray="4 3"
                className="animate-spin-slow opacity-90 origin-center"
              />

              {/* Middle Counter-Clockwise Dotted Ring */}
              <circle
                cx="24"
                cy="24"
                r="16"
                stroke="url(#agentRingGrad2)"
                strokeWidth="1.3"
                strokeDasharray="2 2"
                className="animate-spin-slow-reverse opacity-80 origin-center"
              />

              {/* Active Sweeping Radar Beam */}
              <g className="animate-radar-sweep origin-center">
                <path
                  d="M24 24 L24 4 A20 20 0 0 1 44 24 Z"
                  fill="url(#agentSweepGrad)"
                  opacity="0.4"
                />
                <line
                  x1="24"
                  y1="24"
                  x2="24"
                  y2="4"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </g>

              {/* Precision Crosshairs */}
              <line x1="24" y1="2" x2="24" y2="6.5" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="24" y1="41.5" x2="24" y2="46" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="2" y1="24" x2="6.5" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="41.5" y1="24" x2="46" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />

              {/* Central Hexagonal Shield Badge */}
              <polygon
                points="24,13 32.5,18 32.5,28 24,33.5 15.5,28 15.5,18"
                fill="url(#agentShieldGrad)"
                stroke="#6366f1"
                strokeWidth="1.6"
              />

              {/* Center Beacon Ping Dot */}
              <circle cx="24" cy="23" r="5" fill="#38bdf8" className="animate-ping opacity-75 origin-center" />
              <circle cx="24" cy="23" r="2.8" fill="#38bdf8" />
              <circle cx="24" cy="23" r="1.3" fill="#ffffff" />

              <defs>
                <linearGradient id="agentRingGrad1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2563eb" />
                  <stop offset="0.5" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="agentRingGrad2" x1="48" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#3b82f6" />
                </linearGradient>
                <radialGradient id="agentSweepGrad" cx="24" cy="24" r="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="agentShieldGrad" x1="15.5" y1="13" x2="32.5" y2="33.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1e1b4b" />
                  <stop offset="1" stopColor="#0f172a" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* AI Radar Pill Badge with Pulsing Live Status */}
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white text-[10px] sm:text-[11px] font-black tracking-widest uppercase shadow-md border border-cyan-400/40 whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-90" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-xs">
              AI EARLY-WARNING RADAR
            </span>
          </div>
        </div>

        {/* Title: AGENT 69 with Animated Gradient & Accents (Larger Font & Brighter Style) */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 whitespace-nowrap">
          {/* Left Tech Accent Line */}
          <div className="hidden sm:flex items-center gap-1 opacity-80">
            <span className="w-5 md:w-10 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 rounded-full" />
            <span className="w-2 h-2 rotate-45 border-2 border-cyan-400 bg-cyan-400/30" />
          </div>

          <h1 className="relative font-black tracking-[0.18em] sm:tracking-[0.24em] text-2xl sm:text-3xl md:text-4xl lg:text-5xl uppercase select-none transition-all duration-300 leading-none">
            <span className="animate-agent-title">
              AGENT
            </span>
            <span className="ml-2.5 sm:ml-3 animate-agent-69-badge">
              69
            </span>
          </h1>

          {/* Right Tech Accent Line */}
          <div className="hidden sm:flex items-center gap-1 opacity-80">
            <span className="w-2 h-2 rotate-45 border-2 border-cyan-400 bg-cyan-400/30" />
            <span className="w-5 md:w-10 h-[2.5px] bg-gradient-to-l from-transparent via-cyan-400 to-indigo-500 rounded-full" />
          </div>
        </div>

        {/* Bottom Subtitle: Institutional Mission Tagline (Brighter & Crisp) */}
        <div className="flex items-center justify-center gap-2 text-[9px] sm:text-[10.5px] font-black tracking-[0.16em] sm:tracking-[0.2em] text-slate-600 uppercase mt-1 whitespace-nowrap">
          <span className="text-slate-700">STUDENT SUCCESS INTELLIGENCE</span>
          <span className="text-cyan-500">•</span>
          <span className="text-indigo-600">REAL-TIME MONITOR</span>
        </div>
      </div>

      {/* Right: Accreditation Seals (Animated Breathe & Larger Size) */}
      <div className="flex items-center shrink-0">
        <img
          src="/vignan-accreditations.svg"
          alt="Accreditations - DSIR Certified, NAAC A+, NIRF, NBA"
          className="h-13 sm:h-15 md:h-17 lg:h-20 max-h-[82px] w-auto object-contain animate-logo-breathe hover:scale-105 transition-transform duration-300 cursor-pointer"
        />
      </div>
    </div>
  );
};
