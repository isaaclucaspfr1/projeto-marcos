
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
  Printer,
  LogOut,
  UserMinus,
  ArrowRightLeft
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';

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
  const [showAiReportModal, setShowAiReportModal] = useState(false);
  
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
      
      // Obter lista resumida de pacientes para o contexto da IA
      const monthlyPatients = patients.filter(p => {
        const label = new Date(p.createdAt).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return label === month;
      });

      const patientSummary = monthlyPatients.map(p => 
        `- ${p.name} (${p.medicalRecord}): ${p.status} | Especialidade: ${p.specialty} | Destino: ${p.transferDestinationSector || 'N/A'}`
      ).join('\n');

      const prompt = `Gere um relatório gerencial detalhado e estruturado para o mês de ${month} baseado nos seguintes indicadores de performance hospitalar:

      DADOS ESTATÍSTICOS:
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

      LISTA DE PACIENTES DO PERÍODO:
      ${patientSummary}

      REQUISITOS OBRIGATÓRIOS DE FORMATAÇÃO:
      1. Use títulos de seção claros com "## ".
      2. Use listas com marcadores "-" para detalhar pontos.
      3. Use negrito "**" para destacar números e indicadores críticos.
      4. Crie parágrafos curtos e objetivos.
      5. NÃO gere um bloco único de texto. Use quebras de linha duplas entre seções.
      
      ESTRUTURA DO RELATÓRIO:
      1. ## Resumo Executivo: Visão geral do mês.
      2. ## Análise de Fluxo: Como as especialidades se comportaram.
      3. ## Gargalos Identificados: Onde o processo está travando (baseado nos tempos e pendências).
      4. ## Conclusão e Plano de Ação: Sugestões práticas para o próximo mês.

      Tom de voz: Profissional, analítico e focado em melhoria contínua.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || '');
      setShowAiReportModal(true);
    } catch (e) {
      setAiAnalysis("## Erro na Geração\n\nNão foi possível processar a análise detalhada no momento. Por favor, utilize os indicadores numéricos acima para sua gestão.");
      setShowAiReportModal(true);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedReportMonth(month);
    setShowMonthSelector(false);
    if (monthlyStats) generateMonthlyAnalysis(monthlyStats, month);
  };

  const handleCompleteTransfer = (p: Patient) => {
    const destination = p.transferDestinationSector || 'setor não informado';
    const bed = p.transferDestinationBed || 'leito não informado';
    
    if (confirm(`Paciente ${p.name} foi transferido para a enfermaria ${destination} e o leito ${bed} solicitado corretamente?`)) {
      onUpdatePatient(p.id, { 
        isTransferred: true, 
        transferredAt: new Date().toISOString(),
        status: p.status.includes('Transferência') ? p.status : 'Transferido'
      });
      alert(`Transferência de ${p.name} concluída com sucesso!`);
      window.dispatchEvent(new CustomEvent('change-view', { detail: 'FINALIZED_PATIENTS' }));
    }
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
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">Analisando indicadores e pacientes...</p>
        </div>
      )}

      {showAiReportModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Análise Gerencial IA</h3>
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest">Relatório Consolidado - {selectedReportMonth}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                       <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowAiReportModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                       <LogOut className="w-5 h-5 rotate-180" />
                    </button>
                 </div>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm markdown-content text-slate-700 leading-relaxed">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                 </div>
              </div>
              <div className="p-6 bg-white border-t flex justify-center gap-4">
                 <button onClick={() => window.print()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2">
                    <Printer className="w-5 h-5" /> Imprimir Relatório
                 </button>
                 <button onClick={() => setShowAiReportModal(false)} className="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">
                    Fechar Visualização
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {currentList.map(p => (
          <div key={p.id} className={`bg-white p-5 rounded-3xl border shadow-sm relative group transition-all hover:shadow-md ${selectedIds.includes(p.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'}`} onClick={() => historyView && isAuthorizedToDelete && (selectedIds.includes(p.id) ? setSelectedIds(prev => prev.filter(i => i !== p.id)) : setSelectedIds(prev => [...prev, p.id]))}>
               <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl ${
                    historyView 
                      ? (p.status === 'Alta' ? 'bg-emerald-50 text-emerald-600' : p.status === 'Evasão' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600') 
                      : 'bg-orange-50 text-orange-600'
                  }`}>
                     {p.status === 'Alta' ? <LogOut className="w-6 h-6" /> : 
                      p.status === 'Evasão' ? <UserMinus className="w-6 h-6" /> : 
                      <User className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <h4 className="font-black text-slate-800 uppercase truncate">{p.name}</h4>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.medicalRecord}</span>
                        {p.age && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">• {p.age} ANOS</span>}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Especialidade</p>
                    <p className="text-[10px] font-bold text-slate-700 uppercase truncate">{p.specialty}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status/Destino</p>
                    <p className={`text-[10px] font-black uppercase truncate ${
                      p.status === 'Alta' ? 'text-emerald-600' : 
                      p.status === 'Evasão' ? 'text-amber-600' : 
                      'text-blue-600'
                    }`}>
                      {p.status === 'Alta' ? 'Alta Hospitalar' : 
                       p.status === 'Evasão' ? 'Evasão' : 
                       (p.transferDestinationSector || p.status)}
                    </p>
                  </div>
               </div>

               <div className={`p-3 rounded-2xl border mb-4 ${historyView ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-center font-bold text-[10px] uppercase tracking-tight">
                     <span className="text-slate-500">Leito Destino</span>
                     <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">
                        {p.transferDestinationBed || (p.status === 'Alta' || p.status === 'Evasão' ? 'N/A' : 'Pendente')}
                     </span>
                  </div>
                  {historyView && p.transferredAt && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest pt-2 mt-2 border-t border-slate-100">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      Finalizado: {new Date(p.transferredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
               </div>

               {!historyView && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleCompleteTransfer(p); }}
                   className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                 >
                   <CheckCircle className="w-4 h-4" /> Concluir Transferência
                 </button>
               )}
            </div>
        ))}
      </div>

      {selectedReportMonth && monthlyStats && (
        <div className="hidden print:block bg-white text-slate-900 font-sans">
          <style>{`
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            @media print {
              body { background: white !important; -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
              
              .print-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 25mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #e2e8f0;
                background: white;
              }
              .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 15mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #e2e8f0;
                background: white;
                font-size: 10px;
                color: #64748b;
              }
              
              .print-table {
                width: 100%;
                border-collapse: collapse;
              }
              .print-table-header-space { height: 30mm; }
              .print-table-footer-space { height: 20mm; }
              
              .page-number:after {
                content: "Página " counter(page);
              }
              .p-card { border: 1px solid #e2e8f0 !important; background: #f8fafc !important; }
            }

            .print-title-small { color: #1e3a8a; font-size: 24px; font-weight: 900; text-transform: uppercase; }
            .markdown-content h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .markdown-content h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-top: 12px; margin-bottom: 6px; color: #475569; }
            .markdown-content p { margin-bottom: 8px; font-size: 12px; line-height: 1.5; }
            .markdown-content ul { margin-bottom: 10px; padding-left: 15px; list-style-type: disc; }
            .markdown-content li { margin-bottom: 4px; font-size: 12px; }
            .markdown-content strong { color: #0f172a; font-weight: 800; }
          `}</style>

          <table className="print-table">
            <thead>
              <tr>
                <td>
                  <div className="print-table-header-space"></div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="print-content">
                    <div className="grid grid-cols-4 gap-4 mb-8">
                       {[
                         { label: 'Total Fluxo', val: monthlyStats.total },
                         { label: 'Altas', val: monthlyStats.altas },
                         { label: 'Média Pendência', val: monthlyStats.averages.pendency + 'h' },
                         { label: 'Média Maca', val: monthlyStats.averages.stretcher + 'h' }
                       ].map(card => (
                         <div key={card.label} className="p-card p-4 rounded-2xl text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase mb-1">{card.label}</p>
                            <h3 className="text-xl font-black text-blue-900">{card.val}</h3>
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                       {[
                         { label: 'Média Transf. Interna', val: monthlyStats.averages.transfer + 'h' },
                         { label: 'Média Transf. UPA', val: monthlyStats.averages.upa + 'h' },
                         { label: 'Média Transf. Externa', val: monthlyStats.averages.external + 'h' }
                       ].map(card => (
                         <div key={card.label} className="p-card p-3 rounded-2xl text-center border-blue-100">
                            <p className="text-[6px] font-black text-slate-500 uppercase mb-1">{card.label}</p>
                            <h3 className="text-base font-black text-indigo-900">{card.val}</h3>
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                       <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/10">
                          <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-4">Demanda por Especialidade</h4>
                          <div className="space-y-1.5">
                             {monthlyStats.specialtyData.slice(0, 10).map(s => (
                               <div key={s.name} className="flex justify-between items-center text-[9px] font-bold border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-600 uppercase">{s.name}</span>
                                  <div className="text-right">
                                    <span className="text-blue-900 font-black">{s.value} pac.</span>
                                    <span className="text-slate-400 ml-2">({s.avgPendency}h pend.)</span>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/10">
                          <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-4">Análise de Pendências</h4>
                          <div className="space-y-1.5">
                             {monthlyStats.pendencyData.slice(0, 10).map(p => (
                               <div key={p.name} className="flex justify-between items-center text-[9px] font-bold border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-600 uppercase truncate max-w-[120px]">{p.name}</span>
                                  <div className="text-right">
                                    <span className="text-amber-700 font-black">{p.count} casos</span>
                                    <span className="text-slate-400 ml-2">({p.avg}h res.)</span>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="markdown-content text-slate-800">
                       {aiAnalysis ? (
                         <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                       ) : (
                         <p className="italic text-slate-400">Gerando relatório consolidado...</p>
                       )}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div className="print-table-footer-space"></div>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Fixed Header */}
          <div className="print-header no-print-screen">
             <div className="flex items-center gap-3">
                <Activity className="w-10 h-10 text-[#1e3a8a]" />
                <h1 className="print-title-small">HospFlow</h1>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dashboard Mensal Consolidado</p>
                <p className="font-bold text-xs text-slate-900">{selectedReportMonth}</p>
             </div>
          </div>

          {/* Fixed Footer */}
          <div className="print-footer no-print-screen">
             <div className="font-black uppercase tracking-widest">
                HospFlow • Gestão de Fluxo Hospitalar
             </div>
             <div className="flex items-center gap-4">
                <span className="font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                <span className="page-number font-black"></span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferManager;
