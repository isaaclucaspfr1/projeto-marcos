import React from 'react';

interface BrandLogoProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 56, glow = true, className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative group" style={{ width: size, height: size }}>
        {glow && (
          <div className="absolute -inset-3 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
        )}
        <img
          src="/marcos_logo.svg"
          alt="Logo Marcos Araújo"
          className="relative object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          style={{ width: size, height: size }}
        />
      </div>
    </div>
  );
};

export default BrandLogo;
