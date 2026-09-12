import React, { useState } from 'react';

interface Robot3DProps {
  className?: string;
  onClick?: () => void;
}

export const Robot3D: React.FC<Robot3DProps> = ({ className = '', onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group ${className}`}
      style={{ perspective: '800px' }}
      title="Agent 69 Superhero Sentinel - Click to chat!"
    >
      {/* Robot Wrapper with 3D Tilt & Floating Physics */}
      <div
        className="relative flex flex-col items-center transition-transform duration-200 ease-out"
        style={{
          transform: isHovered
            ? `translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4 - 6}px, 20px) rotateY(${mouseOffset.x * 0.8}deg) rotateX(${-mouseOffset.y * 0.8}deg) scale(1.05)`
            : 'translate3d(0, 0, 0)',
        }}
      >
        {/* Floating Animation Layer */}
        <div className="relative animate-robot-float">
          {/* Glowing Cyan Antenna Beacon Pulse */}
          <div className="absolute top-[4%] left-[51%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-300 shadow-[0_0_12px_#38bdf8]"></span>
            </span>
          </div>

          {/* Clean Transparent Superhero Robot Cutout */}
          <img
            src="/superhero-robot.png"
            alt="Agent 69 Superhero Robot Sentinel"
            className="h-36 sm:h-40 md:h-44 w-auto object-contain drop-shadow-[0_12px_18px_rgba(30,58,138,0.22)] transition-all duration-300 group-hover:drop-shadow-[0_18px_26px_rgba(37,99,235,0.35)] pointer-events-none"
            loading="eager"
          />
        </div>

        {/* Dynamic Ground Contact Shadow */}
        <div
          className="w-24 sm:w-28 h-2.5 rounded-full bg-blue-950/20 blur-xs mt-0.5 transition-all duration-300"
          style={{
            transform: isHovered
              ? `scale(${0.9 + Math.abs(mouseOffset.x) * 0.01}) translate3d(${mouseOffset.x * 0.2}px, 0, 0)`
              : 'scale(1)',
            opacity: isHovered ? 0.28 : 0.18,
          }}
        />
      </div>
    </div>
  );
};
