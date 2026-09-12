import React, { useState } from 'react';

interface Robot3DProps {
  className?: string;
  onClick?: () => void;
}

export const Robot3D: React.FC<Robot3DProps> = ({ className = '', onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-full overflow-hidden select-none cursor-pointer group ${className}`}
      title="Agent 69 Superhero Sentinel - Click to chat!"
    >
      {/* Moving Patrol Wrapper - Walks Right to Left across the Box in a Loop */}
      <div
        className="animate-robot-walk-loop flex flex-col items-center z-10 transition-all"
        style={{
          animationPlayState: isHovered ? 'paused' : 'running',
        }}
      >
        {/* Interactive Speech Hint Bubble on Hover */}
        <div
          className={`absolute -top-7 z-30 transition-all duration-200 pointer-events-none ${
            isHovered ? 'opacity-100 scale-100 -translate-y-1' : 'opacity-0 scale-90 translate-y-1'
          }`}
        >
          <div className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black shadow-md border border-blue-400 whitespace-nowrap flex items-center gap-1">
            <span>Click to chat!</span>
            <span>💬</span>
          </div>
        </div>

        {/* Walking Step Waddle & Bounce Layer */}
        <div
          className="animate-robot-waddle relative flex flex-col items-center"
          style={{
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        >
          {/* Glowing Cyan Antenna Beacon Pulse */}
          <div className="absolute top-[3%] left-[51%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-300 shadow-[0_0_10px_#38bdf8]"></span>
            </span>
          </div>

          {/* Clean Transparent Superhero Robot Cutout */}
          <img
            src="/superhero-robot.png"
            alt="Agent 69 Superhero Robot Sentinel"
            className="h-32 sm:h-36 md:h-40 w-auto object-contain drop-shadow-[0_10px_16px_rgba(30,58,138,0.22)] transition-transform duration-300 group-hover:scale-105 pointer-events-none"
            loading="eager"
          />
        </div>

        {/* Dynamic Ground Contact Shadow Moving with Feet */}
        <div className="w-20 sm:w-24 h-2 rounded-full bg-blue-950/20 blur-xs mt-0.5 animate-pulse" />
      </div>
    </div>
  );
};
