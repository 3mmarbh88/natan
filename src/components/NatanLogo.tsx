import React from 'react';

interface NatanLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  withGlow?: boolean;
}

export const NatanLogo: React.FC<NatanLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true,
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div
      className={`relative shrink-0 rounded-2xl select-none transition-transform hover:scale-105 duration-200 overflow-hidden shadow-lg shadow-purple-950/60 border border-purple-500/30 bg-slate-900/80 p-0.5 flex items-center justify-center ${
        sizeClasses[size]
      } ${withGlow ? 'drop-shadow-[0_0_16px_rgba(168,85,247,0.35)]' : ''} ${className}`}
    >
      <img
        src="/app-icon.png"
        alt="NATAN Ninja Shifts Logo"
        className="w-full h-full object-cover rounded-[14px]"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
