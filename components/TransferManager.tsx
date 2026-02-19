
import React, { useState, useMemo, useEffect } from 'react';
import { Patient, Role } from '../types';
import { 
  Search, 
  User, 
  Hospital, 
  CheckCircle, 
  CheckSquare, 
  Square, 
  Trash2, 
  FileBarChart, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Stethoscope, 
  TrendingUp, 
  ChevronDown, 
  Sparkles, 
  Loader2,
  Clock,
  Printer
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface TransferManagerProps {
  role: Role;
  patients: Patient[];
  onUpdatePatient: (id: string, updates: Partial<Patient>) => void;
  onDeletePatients?: (ids: string[]) => void;
  historyView?: boolean;
}

const TransferManager: React.FC<TransferManagerProps> = ({ role, patients, onUpdatePatient, onDeletePatients, historyView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  
  const isAuthorizedToDelete = role === 'enfermeiro' || role === 'coordenacao';

  const currentList = useMemo(() => {
    let base = historyView ? patients.filter(p => p.isTransferred) : patients.filter(p => p.isTransferRequested && !p.isTransferred);
    const lowerSearch = searchTerm.toLowerCase();
    return base
      .filter(p => p.name.toLowerCase().includes(lowerSearch) || p.medicalRecord.includes(lowerSearch))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [historyView, patients, searchTerm]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    patients.forEach(p => {
      const date = new Date(p.createdAt);
      const label = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      months.add(label);
    });
    return Array.from(months).sort((a, b) => {
        const [monthA, yearA] = a.split(' de ');
        const [monthB, yearB] = b.split(' de ');
        return new Date(`${monthB} 1, ${yearB}`).getTime() - new Date(`${monthA} 1, ${yearA}`).getTime();
    });
  }, [patients]);

  const monthlyStats = useMemo(() => {
    if (!selectedReportMonth) return null;
    const monthlyPatients = patients.filter(p => {
      const label = new Date(p.createdAt).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return label === selectedReportMonth;
    });

    const total = monthlyPatients.length;
    const stats = {
      total,
      internados: monthlyPatients.filter(p => p.status === 'Internado').length,
      observacao: monthlyPatients.filter(p => p.status === 'Observação').length,
      upa: monthlyPatients.filter(p => p.status === 'Transferência UPA').length,
      externo: monthlyPatients.filter(p => p.status === 'Transferência Externa').length,
      altas: monthlyPatients.filter(p => p.status === 'Alta').length,
      internas: monthlyPatients.filter(p => p.isTransferRequested && !['Transferência UPA', 'Transferência Externa'].includes(p.status)).length,
      pendencias: monthlyPatients.filter(p => p.pendencies !== 'Nenhuma').length
    };

    const specs: Record<string, number> = {};
    monthlyPatients.forEach(p => { specs[p.specialty] = (specs[p.specialty] || 0) + 1; });
    const specialtyData = Object.entries(specs).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { ...stats, specialtyData };
  }, [selectedReportMonth, patients]);

  const generateMonthlyAnalysis = async (stats: any, month: string) => {
    setIsGeneratingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise os dados hospitalares de ${month} para um relatório gerencial:
      - Atendimentos: ${stats.total}, Altas: ${stats.altas}, Transf UPA: ${stats.upa}, Transf Externas: ${stats.externo}.
      - Pendências: ${stats.pendencias}. Especialidade líder: ${stats.specialtyData[0]?.name || 'N/A'}.
      Gere um resumo executivo técnico e inteligente em um parágrafo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || '');
      setTimeout(() => window.print(), 800);
    } catch (e) {
      setAiAnalysis("Relatório mensal consolidado com foco no giro de leitos.");
      setTimeout(() => window.print(), 800);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedReportMonth(month);
    setShowMonthSelector(false);
    const stats = patients.filter(p => new Date(p.createdAt).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) === month);
    // Chamada simplificada para trigger da IA e Print
    if (monthlyStats) generateMonthlyAnalysis(monthlyStats, month);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm no-print">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder={historyView ? "Pesquisar nos finalizados..." : "Filtrar transferências..."} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          {historyView && (
            <button onClick={() => setShowMonthSelector(true)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95 text-xs uppercase tracking-widest">
              <FileBarChart className="w-5 h-5" /> Gerar Relatório Mensal
            </button>
          )}
          {historyView && isAuthorizedToDelete && (
            <button onClick={() => {
              if (selectedIds.length === 0) setSelectedIds(currentList.map(p => p.id));
              else setSelectedIds([]);
            }} className={`p-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase transition-all ${selectedIds.length === currentList.length && currentList.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <CheckSquare className="w-5 h-5" /> Todos
            </button>
          )}
          {selectedIds.length > 0 && (
             <button onClick={() => {
               if(confirm(`Excluir ${selectedIds.length} registros?`)) { onDeletePatients?.(selectedIds); setSelectedIds([]); }
             }} className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-lg active:scale-95 border border-red-500">
                <Trash2 className="w-5 h-5" />
             </button>
          )}
        </div>
      </div>

      {showMonthSelector && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
              <div className="bg-indigo-600 p-8 text-white text-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Consolidado Mensal</h3>
                 <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-2">Selecione o período</p>
              </div>
              <div className="p-8 space-y-4">
                 <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {availableMonths.map(month => (
                      <button key={month} onClick={() => handleMonthSelect(month)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-black text-slate-700 uppercase text-xs flex items-center justify-between">
                         {month} <ChevronDown className="w-4 h-4 text-indigo-400 -rotate-90" />
                      </button>
                    ))}
                 </div>
                 <button onClick={() => setShowMonthSelector(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {isGeneratingAi && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/90 text-white backdrop-blur-xl no-print">
           <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-6" />
           <h2 className="text-2xl font-black uppercase tracking-tight">Consolidando Inteligência Hospitalar</h2>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 animate-pulse">Aguarde, gerando dashboard mensal...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {currentList.map(p => (
          <div key={p.id} className={`bg-white p-5 rounded-3xl border shadow-sm relative group ${selectedIds.includes(p.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'}`} onClick={() => historyView && isAuthorizedToDelete && (selectedIds.includes(p.id) ? setSelectedIds(prev => prev.filter(i => i !== p.id)) : setSelectedIds(prev => [...prev, p.id]))}>
               <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl ${historyView ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                     <User className="w-6 h-6" />
                  </div>
                  <div>
                     <h4 className="font-black text-slate-800 uppercase line-clamp-1">{p.name}</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.medicalRecord}</p>
                  </div>
               </div>
               <div className={`p-4 rounded-2xl border mb-4 space-y-2 ${historyView ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                     <Hospital className={`w-3.5 h-3.5 ${historyView ? 'text-emerald-500' : 'text-orange-500'}`} />
                     <p className={`text-[9px] font-black uppercase ${historyView ? 'text-emerald-600' : 'text-orange-600'}`}>{historyView ? 'Finalizado em' : 'Destino Setorial'}</p>
                  </div>
                  <div className="flex justify-between items-center font-bold text-xs">
                     <span className="text-slate-700 truncate">{p.transferDestinationSector || p.status}</span>
                     <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">L: {p.transferDestinationBed || 'Pendente'}</span>
                  </div>
               </div>
            </div>
        ))}
      </div>

      {selectedReportMonth && monthlyStats && (
        <div className="hidden print:block bg-white text-slate-900 p-0 font-sans" style={{ width: '210mm', height: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
          <style>{`
            @page { size: A4; margin: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; background: white; }
              .p-card { box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15) !important; border: 1.5px solid #bfdbfe !important; }
            }
          `}</style>
          
          <div className="flex flex-col h-full p-[12mm] relative">
             <header className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center">
                      <Activity className="w-8 h-8 text-white" />
                   </div>
                   <div>
                      <h1 className="text-2xl font-black text-blue-900 uppercase leading-none">HospFlow</h1>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dashboard Mensal Consolidado</p>
                   </div>
                </div>
                <div className="bg-slate-100 px-5 py-2 rounded-xl border border-slate-200">
                   <span className="text-sm font-black text-blue-900 uppercase">{selectedReportMonth}</span>
                </div>
             </header>

             <main className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-4 gap-3">
                   {[
                     { label: 'Hospitalizados', val: monthlyStats.internados },
                     { label: 'Em Observação', val: monthlyStats.observacao },
                     { label: 'Transf. UPA', val: monthlyStats.upa },
                     { label: 'Transf. Externas', val: monthlyStats.externo },
                     { label: 'Transf. Internas', val: monthlyStats.internas },
                     { label: 'Altas Realizadas', val: monthlyStats.altas },
                     { label: 'Pendências Fluxo', val: monthlyStats.pendencias },
                     { label: 'Total Mês', val: monthlyStats.total }
                   ].map(card => (
                     <div key={card.label} className="p-card bg-blue-50/50 p-4 rounded-2xl text-center flex flex-col justify-center">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-1">{card.label}</p>
                        <h3 className="text-xl font-black text-blue-900">{card.val}</h3>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="border border-slate-200 rounded-[2.5rem] p-6 bg-slate-50/20">
                      <div className="flex items-center gap-2 mb-4">
                         <BarChart3 className="w-4 h-4 text-blue-600" />
                         <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Demanda por Especialidade</h4>
                      </div>
                      <div className="space-y-1.5">
                         {monthlyStats.specialtyData.slice(0, 8).map(s => (
                           <div key={s.name} className="flex justify-between items-center text-[8px] font-bold border-b border-slate-100 pb-1">
                              <span className="text-slate-600 uppercase">{s.name}</span>
                              <span className="text-blue-700">{s.value}</span>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="border border-slate-200 rounded-[2.5rem] p-6 bg-slate-50/20 flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                         <TrendingUp className="w-4 h-4 text-emerald-600" />
                         <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Indicadores de Desempenho</h4>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs">
                               {((monthlyStats.altas / monthlyStats.total) * 100).toFixed(0)}%
                            </div>
                            <div>
                               <p className="text-[7px] font-black text-slate-400 uppercase">Eficiência de Altas</p>
                               <p className="text-[10px] font-bold text-slate-800">Giro Assistencial Positivo</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-black text-xs">
                               {((monthlyStats.pendencias / monthlyStats.total) * 100).toFixed(0)}%
                            </div>
                            <div>
                               <p className="text-[7px] font-black text-slate-400 uppercase">Impacto de Pendências</p>
                               <p className="text-[10px] font-bold text-slate-800">Monitoramento Crítico</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-blue-900 text-white p-6 rounded-[2.5rem] shadow-xl">
                   <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Resumo Estratégico IA - Gestão Hospitalar</h3>
                   </div>
                   <p className="text-[10px] font-bold leading-relaxed text-blue-100 text-justify italic">
                      {aiAnalysis || "Processando análise de inteligência para o período selecionado..."}
                   </p>
                </div>
             </main>

             <footer className="mt-auto pt-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                   <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="h-[2px] flex-1 bg-blue-900 opacity-20"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                   HospFlow Gestão Assistencial • Marcos Araújo • {new Date().toLocaleDateString('pt-BR')}
                </p>
             </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferManager;
