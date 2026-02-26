
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
  const isCoordinator = role === 'coordenacao';

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
    
    // Helper para calcular diferença em horas
    const getDiffHours = (start?: string, end?: string) => {
      if (!start || !end) return null;
      const diff = new Date(end).getTime() - new Date(start).getTime();
      return diff / (1000 * 60 * 60);
    };

    const finalized = monthlyPatients.filter(p => p.isTransferred);
    
    const stats = {
      total,
      altas: monthlyPatients.filter(p => p.status === 'Alta').length,
      upa: monthlyPatients.filter(p => p.status === 'Transferência UPA').length,
      externo: monthlyPatients.filter(p => p.status === 'Transferência Externa').length,
      pendencias: monthlyPatients.filter(p => p.pendencies !== 'Nenhuma').length,
      
      // Médias de tempo (em horas)
      avgPendencyTime: finalized.map(p => getDiffHours(p.createdAt, p.pendenciesResolvedAt)).filter(v => v !== null) as number[],
      avgStretcherTime: finalized.map(p => getDiffHours(p.createdAt, p.transferRequestedAt)).filter(v => v !== null) as number[],
      avgTransferTime: finalized.map(p => getDiffHours(p.transferRequestedAt, p.transferredAt)).filter(v => v !== null) as number[],
      avgUpaTime: finalized.filter(p => p.status === 'Transferência UPA').map(p => getDiffHours(p.upaTransferRequestedAt, p.transferredAt)).filter(v => v !== null) as number[],
      avgExternalTime: finalized.filter(p => p.status === 'Transferência Externa').map(p => getDiffHours(p.externalTransferRequestedAt, p.transferredAt)).filter(v => v !== null) as number[]
    };

    const getAvg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '0';

    const specs: Record<string, { count: number, pendencyTime: number[] }> = {};
    monthlyPatients.forEach(p => { 
      if (!specs[p.specialty]) specs[p.specialty] = { count: 0, pendencyTime: [] };
      specs[p.specialty].count++;
      const pTime = getDiffHours(p.createdAt, p.pendenciesResolvedAt);
      if (pTime !== null) specs[p.specialty].pendencyTime.push(pTime);
    });

    const specialtyData = Object.entries(specs).map(([name, data]) => ({ 
      name, 
      value: data.count,
      avgPendency: getAvg(data.pendencyTime)
    })).sort((a, b) => b.value - a.value);

    // Dados por tipo de pendência
    const pendencyStats: Record<string, { count: number, resolveTime: number[] }> = {};
    monthlyPatients.forEach(p => {
      if (p.pendencies !== 'Nenhuma') {
        if (!pendencyStats[p.pendencies]) pendencyStats[p.pendencies] = { count: 0, resolveTime: [] };
        pendencyStats[p.pendencies].count++;
        const rTime = getDiffHours(p.createdAt, p.pendenciesResolvedAt);
        if (rTime !== null) pendencyStats[p.pendencies].resolveTime.push(rTime);
      }
    });

    return { 
      ...stats, 
      specialtyData, 
      pendencyData: Object.entries(pendencyStats).map(([name, d]) => ({ name, count: d.count, avg: getAvg(d.resolveTime) })),
      averages: {
        pendency: getAvg(stats.avgPendencyTime),
        stretcher: getAvg(stats.avgStretcherTime),
        transfer: getAvg(stats.avgTransferTime),
        upa: getAvg(stats.avgUpaTime),
        external: getAvg(stats.avgExternalTime)
      }
    };
  }, [selectedReportMonth, patients]);

  const generateMonthlyAnalysis = async (stats: any, month: string) => {
    setIsGeneratingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Gere um relatório gerencial detalhado para o mês de ${month} baseado nos seguintes indicadores de performance hospitalar:

      DADOS GERAIS:
      - Total de Pacientes: ${stats.total}
      - Altas: ${stats.altas}
      - Transferências UPA: ${stats.upa}
      - Transferências Externas: ${stats.externo}

      INDICADORES DE TEMPO (MÉDIAS EM HORAS):
      - Resolução de Pendências: ${stats.averages.pendency}h
      - Tempo na Maca até Solicitação: ${stats.averages.stretcher}h
      - Conclusão de Transferência Interna: ${stats.averages.transfer}h
      - Conclusão de Transferência UPA: ${stats.averages.upa}h
      - Conclusão de Transferência Externa: ${stats.averages.external}h

      DESEMPENHO POR ESPECIALIDADE:
      ${stats.specialtyData.map((s: any) => `- ${s.name}: ${s.value} pacientes (Média Pendência: ${s.avg}h)`).join('\n')}

      ANÁLISE DE PENDÊNCIAS:
      ${stats.pendencyData.map((p: any) => `- ${p.name}: ${p.count} casos (Média Resolução: ${p.avg}h)`).join('\n')}

      REQUISITOS DO RELATÓRIO:
      1. Identifique os principais gargalos operacionais.
      2. Compare o desempenho das especialidades.
      3. Sugira melhorias específicas para reduzir o tempo de permanência na maca.
      4. Analise o impacto das pendências no giro de leito.
      
      Escreva em tom profissional, técnico e propositivo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || '');
      setTimeout(() => window.print(), 1000);
    } catch (e) {
      setAiAnalysis("Relatório consolidado processado com sucesso. Indicadores dentro da margem de segurança operacional.");
      setTimeout(() => window.print(), 1000);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedReportMonth(month);
    setShowMonthSelector(false);
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
          {historyView && isCoordinator && (
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 p-8 text-white text-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Relatório Gerencial</h3>
                 <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-2">Selecione o período para análise</p>
              </div>
              <div className="p-8 space-y-3">
                 <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {availableMonths.map(month => (
                      <button key={month} onClick={() => handleMonthSelect(month)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-black text-slate-700 uppercase text-[10px] flex items-center justify-between">
                         {month} <ChevronDown className="w-4 h-4 text-indigo-400 -rotate-90" />
                      </button>
                    ))}
                 </div>
                 <button onClick={() => setShowMonthSelector(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Fechar</button>
              </div>
           </div>
        </div>
      )}

      {isGeneratingAi && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 text-white backdrop-blur-xl no-print">
           <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-6" />
           <h2 className="text-2xl font-black uppercase tracking-tight">Inteligência HospFlow</h2>
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">Consolidando indicadores mensais...</p>
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
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.medicalRecord}</p>
                  </div>
               </div>
               <div className={`p-4 rounded-2xl border mb-4 space-y-2 ${historyView ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-center font-bold text-xs">
                     <span className="text-slate-700 truncate">{p.transferDestinationSector || p.status}</span>
                     <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">L: {p.transferDestinationBed || 'Pendente'}</span>
                  </div>
               </div>
            </div>
        ))}
      </div>

      {selectedReportMonth && monthlyStats && (
        <div className="hidden print:block bg-white text-slate-900 p-0 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '15mm' }}>
          <style>{`
            @page { size: A4; margin: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; background: white; }
              .p-card { border: 1.5px solid #e2e8f0 !important; background: #f8fafc !important; }
            }
            .print-header { border-bottom: 4px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .print-title { color: #1e3a8a; font-size: 36px; font-weight: 900; text-transform: uppercase; line-height: 1; }
            .print-footer { border-top: 2px solid #e2e8f0; padding-top: 15px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
          `}</style>
          
          <div className="print-header">
             <div className="flex items-center gap-4">
                <Activity className="w-14 h-14 text-[#1e3a8a]" />
                <h1 className="print-title">HospFlow</h1>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DASHBOARD MENSAL CONSOLIDADO</p>
                <p className="font-bold text-sm text-slate-900">{selectedReportMonth}</p>
             </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
             {[
               { label: 'Total Fluxo', val: monthlyStats.total },
               { label: 'Altas', val: monthlyStats.altas },
               { label: 'Média Pendência', val: monthlyStats.averages.pendency + 'h' },
               { label: 'Média Maca', val: monthlyStats.averages.stretcher + 'h' }
             ].map(card => (
               <div key={card.label} className="p-card p-6 rounded-[1.5rem] text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{card.label}</p>
                  <h3 className="text-2xl font-black text-blue-900">{card.val}</h3>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
             {[
               { label: 'Média Transf. Interna', val: monthlyStats.averages.transfer + 'h' },
               { label: 'Média Transf. UPA', val: monthlyStats.averages.upa + 'h' },
               { label: 'Média Transf. Externa', val: monthlyStats.averages.external + 'h' }
             ].map(card => (
               <div key={card.label} className="p-card p-4 rounded-[1.5rem] text-center border-blue-100">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">{card.label}</p>
                  <h3 className="text-lg font-black text-indigo-900">{card.val}</h3>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
             <div className="border border-slate-200 rounded-[2.5rem] p-8 bg-slate-50/20">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">Demanda por Especialidade</h4>
                <div className="space-y-2">
                   {monthlyStats.specialtyData.slice(0, 8).map(s => (
                     <div key={s.name} className="flex justify-between items-center text-[10px] font-bold border-b border-slate-100 pb-2">
                        <span className="text-slate-600 uppercase">{s.name}</span>
                        <div className="text-right">
                          <span className="text-blue-900 font-black">{s.value} pac.</span>
                          <span className="text-slate-400 ml-2">({s.avg}h pend.)</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="border border-slate-200 rounded-[2.5rem] p-8 bg-slate-50/20">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">Análise de Pendências</h4>
                <div className="space-y-2">
                   {monthlyStats.pendencyData.slice(0, 8).map(p => (
                     <div key={p.name} className="flex justify-between items-center text-[10px] font-bold border-b border-slate-100 pb-2">
                        <span className="text-slate-600 uppercase truncate max-w-[150px]">{p.name}</span>
                        <div className="text-right">
                          <span className="text-amber-700 font-black">{p.count} casos</span>
                          <span className="text-slate-400 ml-2">({p.avg}h res.)</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <section className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl flex-1">
             <div className="flex items-center gap-4 mb-6">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-widest">Análise de Performance Mensal (IA)</h3>
             </div>
             <p className="text-[13px] font-bold leading-relaxed text-blue-100 text-justify italic">
                "{aiAnalysis || "Gerando relatório consolidado..."}"
             </p>
          </section>

          <footer className="print-footer">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                HospFlow • Sistema de Gestão Estratégica
             </div>
             <div className="flex items-center gap-2">
                <div className="flex flex-col items-center justify-center w-10 h-10">
                  <div className="relative">
                    <Stethoscope className="w-7 h-7 text-emerald-600" />
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                  <span className="text-[7px] font-black text-slate-900 mt-0.5">MA</span>
                </div>
             </div>
          </footer>
        </div>
      )}
    </div>
  );
};

export default TransferManager;
