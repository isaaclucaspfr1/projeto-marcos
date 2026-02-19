
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Patient } from '../types';
import { 
  Printer, 
  Activity, 
  Sparkles, 
  Loader2, 
  Users, 
  AlertCircle, 
  Bed, 
  Lightbulb, 
  Stethoscope,
  PieChart as PieChartIcon,
  BarChart3,
  Clock
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { SPECIALTIES } from '../constants';

interface DashboardProps {
  patients: Patient[];
}

const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
  const [aiAnalysis, setAiAnalysis] = useState<{ summary: string; improvements: string[] }>({ summary: '', improvements: [] });
  const [loadingAi, setLoadingAi] = useState(false);
  const lastAnalyzedCount = useRef<number>(-1);

  const active = useMemo(() => patients.filter(p => !p.isTransferred), [patients]);
  
  const stats = useMemo(() => {
    return {
      total: active.length,
      internados: active.filter(p => p.status === 'Internado').length,
      observacao: active.filter(p => p.status === 'Observação').length,
      reavaliacao: active.filter(p => p.status === 'Reavaliação').length,
      pendencias: active.filter(p => p.pendencies !== 'Nenhuma' || !p.hasBracelet || !p.hasBedIdentification).length,
      macas: active.filter(p => p.situation === 'Maca').length,
      cadeiras: active.filter(p => p.situation === 'Cadeira').length,
      gargalos: active.filter(p => p.pendencies === 'Sem prescrição médica' || p.pendencies === 'Aguardando exames laboratoriais').length
    };
  }, [active]);

  const specialtyData = useMemo(() => {
    return SPECIALTIES.map(s => ({
      name: s,
      value: active.filter(p => p.specialty === s).length
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [active]);

  const statusPieData = useMemo(() => [
    { name: 'Internados', value: stats.internados, color: '#2563eb' },
    { name: 'Observação', value: stats.observacao, color: '#4f46e5' },
    { name: 'Reavaliação', value: stats.reavaliacao, color: '#f59e0b' }
  ], [stats]);

  const generateAiSummary = async () => {
    if (active.length === lastAnalyzedCount.current || active.length === 0) return;
    setLoadingAi(true);
    lastAnalyzedCount.current = active.length;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise objetivamente esta unidade hospitalar para um gestor de enfermagem:
      INDICADORES:
      - Total de Pacientes: ${stats.total}
      - Status: ${stats.internados} Internados, ${stats.observacao} em Obs, ${stats.reavaliacao} em Reaval.
      - Acomodação: ${stats.macas} em Macas, ${stats.cadeiras} em Cadeiras.
      - Pendências Gerais: ${stats.pendencias}.
      - Gargalos de Fluxo (Exames/Prescrição): ${stats.gargalos}.
      
      Gere um JSON com o seguinte formato:
      {
        "summary": "Um relatório técnico e claro (parágrafo único) resumindo a gravidade da ocupação e fluxos.",
        "improvements": ["Sugestão 1 breve de agilidade", "Sugestão 2 breve", "Sugestão 3 breve"]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
      });
      setAiAnalysis(JSON.parse(response.text || '{}'));
    } catch (e) {
      setAiAnalysis({ summary: 'Análise indisponível no momento.', improvements: [] });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => generateAiSummary(), 1000);
    return () => clearTimeout(timer);
  }, [active.length]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center no-print">
         <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Painel Gerencial HospFlow</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento de Fluxo e Ocupação em Tempo Real</p>
         </div>
         <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-widest">
            <Printer className="w-5 h-5" /> Imprimir Relatório
         </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 no-print">
        {[
          { label: 'Ocupação Total', val: stats.total, color: 'bg-slate-900 text-white', icon: Users },
          { label: 'Internados', val: stats.internados, color: 'bg-blue-600 text-white', icon: Bed },
          { label: 'Observações', val: stats.observacao, color: 'bg-indigo-600 text-white', icon: Activity },
          { label: 'Reavaliações', val: stats.reavaliacao, color: 'bg-amber-500 text-white', icon: Clock },
          { label: 'Pendências', val: stats.pendencias, color: 'bg-red-600 text-white', icon: AlertCircle }
        ].map(card => (
          <div key={card.label} className={`${card.color} p-5 rounded-[2rem] shadow-lg flex flex-col items-center text-center transition-transform hover:scale-[1.02]`}>
             <card.icon className="w-6 h-6 mb-2 opacity-60" />
             <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">{card.label}</p>
             <h3 className="text-3xl font-black">{card.val}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pacientes por Especialidade</h4>
           </div>
           <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={specialtyData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                       {specialtyData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-2 mb-6">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Geral da Unidade</h4>
           </div>
           <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={statusPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {statusPieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Pie>
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="hidden print:block bg-white text-slate-900 p-0 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
        <style>{`
          @page { size: A4; margin: 10mm; }
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; }
            .print-card { border: 1.5px solid !important; }
          }
        `}</style>
        
        <header className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900">Painel Gerencial HospFlow</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento de Fluxo e Ocupação em Tempo Real</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Emitido em</p>
            <p className="text-[10px] font-bold">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </header>

        <section className="flex gap-2 mb-6">
          {[
            { label: 'Ocupação Total', val: stats.total, border: 'border-slate-800', bg: 'bg-slate-50', text: 'text-slate-900' },
            { label: 'Internados', val: stats.internados, border: 'border-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
            { label: 'Observações', val: stats.observacao, border: 'border-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-700' },
            { label: 'Reavaliações', val: stats.reavaliacao, border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
            { label: 'Pendências', val: stats.pendencias, border: 'border-red-600', bg: 'bg-red-50', text: 'text-red-700' }
          ].map(card => (
            <div key={card.label} className={`flex-1 ${card.bg} ${card.border} border-2 p-3 rounded-2xl text-center print-card`}>
              <p className="text-[7px] font-black uppercase text-slate-500 mb-1">{card.label}</p>
              <h3 className={`text-xl font-black ${card.text}`}>{card.val}</h3>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-slate-200 rounded-3xl p-4 bg-slate-50/30">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Pacientes por Especialidade</h4>
            <div className="space-y-1.5">
              {specialtyData.slice(0, 8).map(s => (
                <div key={s.name} className="flex justify-between items-center text-[9px] font-bold">
                  <span className="text-slate-600">{s.name}</span>
                  <span className="text-blue-600">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 rounded-3xl p-4 bg-slate-50/30">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Status Geral da Unidade</h4>
            <div className="space-y-3">
              {statusPieData.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <div className="flex-1">
                    <p className="text-[7px] font-black text-slate-400 uppercase">{s.name}</p>
                    <p className="text-[9px] font-black text-slate-800">{s.value} Pacientes ({stats.total > 0 ? ((s.value/stats.total)*100).toFixed(0) : 0}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="border border-slate-200 rounded-[2rem] p-5 bg-white shadow-sm flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Análise de Gestão Inteligente</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[8px] font-black text-blue-600 uppercase mb-2">Relatório Situacional Objetivo</p>
              <p className="text-[9px] font-bold text-blue-900 leading-relaxed text-justify">{aiAnalysis.summary}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[8px] font-black text-emerald-600 uppercase mb-2">Propostas de Melhoria & Agilidade</p>
              <ul className="space-y-2">
                {aiAnalysis.improvements.map((tip, i) => (
                  <li key={i} className="text-[8px] font-bold text-emerald-900 flex items-start gap-1.5">
                    <span className="text-emerald-500 font-black">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
          <p>HospFlow Gestão Assistencial • v3.2</p>
          <div className="flex items-center gap-2">
            <span>Marcos Araújo</span>
            <Stethoscope className="w-4 h-4 text-emerald-600" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
