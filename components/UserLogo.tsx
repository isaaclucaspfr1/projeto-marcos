
import React from 'react';
import { Stethoscope, ShieldCheck, Briefcase, Sparkles } from 'lucide-react';
import { Role } from '../types';

interface UserLogoProps {
  role: Role;
  username?: string;
  size?: string;
  iconSize?: string;
  className?: string;
}

const UserLogo: React.FC<UserLogoProps> = ({ role, username, size = "w-10 h-10", iconSize = "w-5 h-5", className = "" }) => {
  const isDev = username === '5669';

  if (isDev) {
    return (
      <div className={`${size} bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 relative ${className}`}>
        <Stethoscope className={`${iconSize} text-emerald-600`} />
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-3 h-3 text-yellow-500 fill-yellow-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (role === 'coordenacao') {
    return (
      <div className={`${size} bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 ${className}`}>
        <Briefcase className={`${iconSize} text-slate-100`} />
      </div>
    );
  }

  if (role === 'enfermeiro') {
    return (
      <div className={`${size} bg-blue-600 rounded-xl flex items-center justify-center border border-blue-500 ${className}`}>
        <ShieldCheck className={`${iconSize} text-white`} />
      </div>
    );
  }

  // Default: Técnico
  return (
    <div className={`${size} bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500 ${className}`}>
      <Stethoscope className={`${iconSize} text-white`} />
    </div>
  );
};

export default UserLogo;
