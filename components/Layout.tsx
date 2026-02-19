
import React from 'react';
import { User, AppView } from '../types';
import { ChevronLeft, LogOut, ShieldCheck, Stethoscope, Briefcase } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LayoutProps {
  user: User;
  currentView: AppView;
  selectedUnit: string | null;
  onBack: () => void;
  onLogout: () => void;
  title: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, currentView, selectedUnit, onBack, onLogout, title, children }) => {
  // Função auxiliar para obter o prefixo do cargo de forma limpa
  const getRolePrefix = (role: string) => {
    switch (role) {
      case 'enfermeiro': return 'Enf.';
      case 'coordenacao': return 'COORD.';
      case 'tecnico': return 'TE';
      default: return 'TE';
    }
  };

  const rolePrefix = getRolePrefix(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Faixa azul-escuro em degrade do título até a saudação */}
      <header className="bg-gradient-to-b from-slate-950 via-blue-950 to-blue-900 sticky top-0 z-40 no-print shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentView !== 'MAIN_MENU' && currentView !== 'UNIT_SELECTION' && (
              <button onClick={onBack} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl shadow-lg border border-blue-900/50">
              <BrandLogo size={38} glow={false} />
              <div className="leading-tight">
                <h1 className="text-lg font-black text-white tracking-tighter">HospFlow</h1>
                <p className="text-[9px] font-black text-blue-200 uppercase tracking-[0.25em]">Gestão de Enfermagem</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-black text-white uppercase tracking-tight">
                {rolePrefix} {user.name}
              </span>
              <span className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em]">HospFlow Assistencial</span>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-200 border border-white/10">
               {user.role === 'enfermeiro' ? <ShieldCheck className="w-5 h-5" /> : 
                user.role === 'coordenacao' ? <Briefcase className="w-5 h-5" /> : 
                <Stethoscope className="w-5 h-5" />}
            </div>
            <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Persistência da Saudação dentro do bloco de gradiente */}
        {selectedUnit && (
          <div className="px-6 py-4 bg-blue-950/20 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
               <p className="text-sm font-bold text-white">
                  Olá {rolePrefix} {user.name} você esta em {selectedUnit === 'Hospital Odilon Behrens' ? 'HOB' : selectedUnit}
               </p>
               <p className="text-xs font-semibold text-blue-200/90 italic mt-0.5">
                  Tenha um excelente trabalho hoje!
               </p>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        <div className="mb-6 flex items-center gap-2 no-print">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
           <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{title.replace(/_/g, ' ')}</h2>
        </div>
        {children}
      </main>

      <footer className="no-print py-4 border-t border-slate-200 bg-white">
         <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <span>HospFlow Assistencial v3.2</span>
            <span>Sistema Seguro e Criptografado</span>
         </div>
      </footer>
    </div>
  );
};

export default Layout;
