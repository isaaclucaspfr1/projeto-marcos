
import React, { useState } from 'react';
import { Info, Mail, Send, ArrowLeft, Activity, User, ShieldCheck, HeartPulse, Stethoscope, Sparkles, Lock, Gavel, Scale } from 'lucide-react';
import { User as UserType } from '../types';
import BrandLogo from './BrandLogo';

interface AboutViewProps {
  user: UserType;
  onBack: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ user, onBack }) => {
  const [feedback, setFeedback] = useState({ name: user.name, username: user.username, text: '' });
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Sugestão/Reclamação HospFlow - ${feedback.name}`);
    const body = encodeURIComponent(`Nome: ${feedback.name}\nUsuário: ${feedback.username}\n\nMensagem:\n${feedback.text}`);
    window.location.href = `mailto:marcosaraujo.hob@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Seção Principal: Sobre o App */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <Info className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl font-black tracking-tighter uppercase">Sobre o HospFlow</h2>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tecnologia, Ética e Segurança de Dados</p>
        </div>
        
        <div className="p-8 space-y-6 text-slate-700 leading-relaxed font-medium">
          <p>
            O <strong>HospFlow</strong> foi desenvolvido como uma solução estratégica para enfrentar um dos principais desafios da gestão hospitalar moderna: a superlotação e o controle eficiente do fluxo de pacientes.
          </p>
          <p>
            Sua proposta é otimizar o monitoramento em tempo real, tornando o ambiente assistencial mais organizado, rastreável e seguro. Por meio de uma interface intuitiva e funcional, o aplicativo oferece ao enfermeiro uma visão ampla e integrada do setor, enquanto possibilita ao técnico de enfermagem executar suas atividades com maior precisão, agilidade e registro digital confiável.
          </p>
          <p>
            Além de apoiar diretamente a gestão hospitalar, o sistema gera dados em tempo real, relatórios diários e mensais, além de dashboards gerenciais que auxiliam na tomada de decisões estratégicas.
          </p>
          <p>
            O HospFlow representa uma solução inovadora e tecnológica, contribuindo para a modernização dos processos assistenciais e para o avanço da saúde no contexto da transformação digital.
          </p>

          {/* Seção de Segurança e LGPD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
               <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Segurança e LGPD</h4>
               </div>
               <p className="text-xs text-blue-900 leading-relaxed">
                  O sistema opera em total conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>. Utilizamos criptografia e persistência local segura, garantindo que informações sensíveis não sejam compartilhadas indevidamente. O acesso é restrito via autenticação numérica pessoal.
               </p>
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
               <div className="flex items-center gap-2 mb-3">
                  <Gavel className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Propriedade Intelectual</h4>
               </div>
               <p className="text-xs text-emerald-900 leading-relaxed">
                  O HospFlow é de autoria e propriedade intelectual exclusiva do desenvolvedor <strong>Marcos Araújo</strong>. O projeto foi criado de forma <strong>independente e fora de qualquer vínculo empregatício</strong> ou obrigações contratuais com instituições terceiras.
               </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
             <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-slate-600" />
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Termos de Uso Institucional</h4>
             </div>
             <p className="text-xs text-slate-700 leading-relaxed">
                A disponibilização deste aplicativo para uso oficial em unidades assistenciais de saúde ocorre exclusivamente mediante a formalização de um <strong>Termo de Cooperação Técnica</strong> ou <strong>Contrato de Licença de Software</strong>. Tais instrumentos garantem a responsabilidade mútua, a governança dos dados e a segurança jurídica de ambas as partes.
             </p>
          </div>
          
          <div className="pt-10 border-t border-slate-100">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-12">
                   <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-center">
                         <Activity className="w-10 h-10 text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black text-blue-800 text-center mt-2 uppercase tracking-widest">HospFlow</p>
                   </div>
                   
                   <div className="h-16 w-px bg-slate-100 hidden md:block"></div>
                   
                   <BrandLogo size={96} />
                </div>
                
                <div className="text-center md:text-right">
                   <p className="text-sm font-black text-slate-900 mb-1">Desenvolvido por Marcos Araújo</p>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                      <ShieldCheck className="w-3 h-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Coren-MG 1299417</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Seção: Sugestões e Reclamações */}
      <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-300 p-8">
        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-6 h-6 text-slate-400" />
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Sugestões e Reclamações</h3>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="text" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none" value={feedback.name} onChange={e => setFeedback({...feedback, name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="text" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none" value={feedback.username} onChange={e => setFeedback({...feedback, username: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Mensagem</label>
            <textarea required rows={4} placeholder="Digite aqui sua sugestão ou reclamação..." className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={feedback.text} onChange={e => setFeedback({...feedback, text: e.target.value})} />
          </div>

          <div className="flex gap-4">
             <button type="button" onClick={onBack} className="flex-1 py-4 bg-slate-200 text-slate-700 font-bold rounded-2xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                <ArrowLeft className="w-4 h-4" /> Voltar
             </button>
             <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {sent ? 'Abrindo E-mail...' : 'Encaminhar Mensagem'}
             </button>
          </div>
        </form>
        <p className="text-center mt-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           Destinatário: marcosaraujo.hob@gmail.com
        </p>
      </div>
    </div>
  );
};

export default AboutView;
