
import React, { useState, useMemo, useDeferredValue } from 'react';
import { Patient, Role } from '../types';
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  UserCheck, 
  User, 
  ExternalLink, 
  Hospital, 
  CheckCircle, 
  CheckSquare, 
  Square, 
  Trash2, 
  Trash,
  X,
  Send,
  FileBarChart,
  Calendar,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Stethoscope,
  TrendingUp,
  ChevronDown
} from 'lucide-react';

interface TransferManagerProps {
  role: Role;
  patients: Patient[];
  onUpdatePatient: (id: string, updates: Partial<Patient>) => void;
  onDeletePatients?: (ids: string[]) => void;
  historyView?: boolean;
}

const TransferManager: React.FC<TransferManagerProps> = ({ role, patients, onUpdatePatient, onDeletePatients, historyView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Estados para o modal de destino externo
  const [destinationModal, setDestinationModal] = useState<Patient | null>(null);
  const [destinationInput, setDestinationInput] = useState('');

  // Estados para Relatório Mensal
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string | null>(null);
  
  const isAuthorizedToDelete = role === 'enfermeiro' || role === 'coordenacao';

  const currentList = useMemo(() => {
    let base = historyView ? patients.filter(p => p.isTransferred) : patients.filter(p => p.isTransferRequested && !p.isTransferred);
    const lowerSearch = deferredSearch.toLowerCase();
    return base
      .filter(p => p.name.toLowerCase().includes(lowerSearch) || p.medicalRecord.includes(lowerSearch))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [historyView, patients, deferredSearch]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    patients.forEach(p => {
      const date = new Date(p.createdAt);
      const label = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      months.add(label);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [patients]);

  const monthlyStats = useMemo(() => {
    if (!selectedReportMonth) return null;
    
    const monthlyPatients = patients.filter(p => {
      const label = new Date(p.createdAt).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return label === selectedReportMonth;
    });

    const total = monthlyPatients.length;
    const altas = monthlyPatients.filter(p => p.status === 'Alta').length;
    const upa = monthlyPatients.filter(p => p.status === 'Transferência UPA').length;
    const externo = monthlyPatients.filter(p => p.status === 'Transferência Externa').length;
    const internas = monthlyPatients.filter(p => p.isTransferRequested && p.status !== 'Transferência UPA' && p.status !== 'Transferência Externa').length;
    const observacao = monthlyPatients.filter(p => p.status === 'Observação').length;
    const internados = monthlyPatients.filter(p => p.status === 'Internado').length;
    const pendencias = monthlyPatients.filter(p => p.pendencies !== 'Nenhuma').length;

    // Distribuição por Especialidade
    const specs: Record<string, number> = {};
    monthlyPatients.forEach(p => {
      specs[p.specialty] = (specs[p.specialty] || 0) + 1;
    });
    const specialtyData = Object.entries(specs)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, altas, upa, externo, internas, observacao, internados, pendencias, specialtyData };
  }, [selectedReportMonth, patients]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length && currentList.length > 0) setSelectedIds([]);
    else setSelectedIds(currentList.map(p => p.id));
  };

  const handleBulkDelete = () => {
    if (!onDeletePatients || selectedIds.length === 0) return;
    if (confirm(`Deseja excluir permanentemente os ${selectedIds.length} registros selecionados do histórico?`)) {
      onDeletePatients(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleFinishTransfer = (p: Patient) => {
    if (p.status === 'Transferência Externa') {
      setDestinationModal(p);
      setDestinationInput('');
      return;
    }
    onUpdatePatient(p.id, { isTransferred: true, transferredAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'FINALIZED_PATIENTS' }));
  };

  const confirmExternalTransfer = () => {
    if (!destinationModal || !destinationInput.trim()) {
      alert("Por favor, informe o destino da transferência.");
      return;
    }
    onUpdatePatient(destinationModal.id, { 
      isTransferred: true, 
      transferredAt: new Date().toISOString(), 
      transferDestinationBed: destinationInput.toUpperCase() 
    });
    setDestinationModal(null);
    setDestinationInput('');
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'FINALIZED_PATIENTS' }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER E AÇÕES */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm no-print">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder={historyView ? "Pesquisar nos finalizados..." : "Filtrar transferências..."} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2">
          {historyView && (
            <button 
              onClick={() => setShowMonthSelector(true)}
              className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              <FileBarChart className="w-5 h-5" /> Gerar Relatório Mensal
            </button>
          )}

          {historyView && isAuthorizedToDelete && (
            <>
              <button onClick={toggleSelectAll} className={`p-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase transition-all ${selectedIds.length === currentList.length && currentList.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <CheckSquare className="w-5 h-5" /> Todos
              </button>
              {selectedIds.length > 0 && (
                 <button onClick={handleBulkDelete} className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-lg active:scale-95 border border-red-500">
                    <Trash2 className="w-5 h-5" />
                 </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE MÊS */}
      {showMonthSelector && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in duration-300">
              <div className="bg-indigo-600 p-8 text-white text-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Relatório Consolidado</h3>
                 <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-2">Selecione o mês de referência</p>
              </div>
              <div className="p-8 space-y-4">
                 <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {availableMonths.map(month => (
                      <button 
                        key={month}
                        onClick={() => { setSelectedReportMonth(month); setShowMonthSelector(false); setTimeout(() => window.print(), 500); }}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-black text-slate-700 uppercase text-xs flex items-center justify-between"
                      >
                         {month}
                         <ChevronDown className="w-4 h-4 text-indigo-400 -rotate-90" />
                      </button>
                    ))}
                    {availableMonths.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-[10px]">Sem dados suficientes</p>}
                 </div>
                 <button onClick={() => setShowMonthSelector(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* GRID DE PACIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {currentList.map(p => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <div key={p.id} className={`bg-white p-5 rounded-3xl border shadow-sm relative group ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'}`} onClick={() => historyView && isAuthorizedToDelete && toggleSelect(p.id)}>
               {historyView && isAuthorizedToDelete && (
                 <div className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    {isSelected ? <CheckCircle className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </div>
               )}
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
               {!historyView && (
                 <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onUpdatePatient(p.id, { isTransferRequested: false }); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleFinishTransfer(p); }} className="flex-1 py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">Finalizar</button>
                 </div>
               )}
               {historyView && (
                 <div className="pt-2 border-t border-slate-50 text-[9px] font-black text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-emerald-500" /> {new Date(p.transferredAt!).toLocaleString('pt-BR')}
                    </div>
                    <span className="text-blue-600 opacity-60">ID: {p.id.slice(0,8)}</span>
                 </div>
               )}
            </div>
          )})}
      </div>

      {/* --- RELATÓRIO MENSAL PARA IMPRESSÃO (PÁGINA ÚNICA A4) --- */}
      {selectedReportMonth && monthlyStats && (
        <div className="hidden print:block bg-white text-slate-950 p-0 font-sans">
          <style>{`
            @page { size: A4; margin: 12mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; }
            
            .report-container { 
              width: 100%; 
              height: 273mm; /* Força página única */
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .report-header { 
              border-bottom: 5px solid #1e1b4b; 
              padding-bottom: 12px; 
              margin-bottom: 25px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
            }

            .header-left { display: flex; align-items: center; gap: 12px; }
            .header-right { text-align: right; }

            .report-title { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: -1.5px; line-height: 0.9; }
            .report-subtitle { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
            .month-badge { background: #1e1b4b; color: white; padding: 6px 15px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 12px; }

            .stats-grid { 
              display: grid; 
              grid-template-cols: repeat(4, 1fr); 
              gap: 12px; 
              margin-bottom: 30px; 
            }

            .stat-card { 
              border: 1px solid #e2e8f0; 
              padding: 18px 10px; 
              border-radius: 16px; 
              text-align: center; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08) !important;
              background: #fff !important;
            }

            .stat-card p { font-size: 7.5px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .stat-card h3 { font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1; }

            .section-title { font-size: 11px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; margin-bottom: 15px; border-left: 5px solid #1e1b4b; padding-left: 12px; }

            .charts-row { 
              display: grid; 
              grid-template-cols: 1.5fr 1fr; 
              gap: 20px; 
              margin-bottom: 30px; 
              flex: 1;
            }

            .chart-box { border: 1px solid #f1f5f9; padding: 15px; border-radius: 16px; background: #fafafa !important; }
            
            /* Simulação de Gráficos de Barras */
            .bar-item { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .bar-label { width: 90px; font-size: 7.5px; font-weight: 900; text-transform: uppercase; color: #475569; overflow: hidden; white-space: nowrap; }
            .bar-track { flex: 1; height: 10px; background: #e2e8f0; border-radius: 3px; }
            .bar-fill { height: 100%; background: #4f46e5; border-radius: 3px; }
            .bar-val { font-size: 8px; font-weight: 900; color: #1e1b4b; width: 15px; text-align: right; }

            /* Lista de Fluxo */
            .fluxo-list { display: flex; flex-direction: column; gap: 12px; }
            .fluxo-item { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .fluxo-info h4 { font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; }
            .fluxo-info p { font-size: 7px; color: #94a3b8; font-weight: 700; }
            .fluxo-tag { font-size: 10px; font-weight: 900; color: #4f46e5; }

            .report-footer { 
              border-top: 2px solid #1e1b4b; 
              padding-top: 15px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              margin-top: auto;
              height: 50px;
            }
          `}</style>
          
          <div className="report-container">
            {/* Cabeçalho */}
            <div className="report-header">
               <div className="header-left">
                  <Activity className="w-12 h-12 text-indigo-900" />
                  <div>
                    <h1 className="report-title">HospFlow</h1>
                    <p className="report-subtitle">Gestão Assistencial • Inteligência em Fluxo</p>
                  </div>
               </div>
               <div className="header-right">
                  <p className="report-subtitle mb-2">Relatório Consolidado</p>
                  <div className="month-badge">{selectedReportMonth}</div>
               </div>
            </div>

            <div className="text-center mb-8">
               <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter">Dashboard Mensal de Atendimento</h2>
            </div>

            {/* Cards Quantitativos */}
            <div className="stats-grid">
               {[
                 { label: 'Ocupação Mensal', val: monthlyStats.total },
                 { label: 'Altas Hospitalares', val: monthlyStats.altas },
                 { label: 'Transferências UPA', val: monthlyStats.upa },
                 { label: 'Transf. Externas', val: monthlyStats.externo },
                 { label: 'Transf. Internas', val: monthlyStats.internas },
                 { label: 'Em Observação', val: monthlyStats.observacao },
                 { label: 'Pendências Fluxo', val: monthlyStats.pendencias },
                 { label: 'Atd. Especializado', val: monthlyStats.specialtyData.length }
               ].map(stat => (
                 <div key={stat.label} className="stat-card">
                    <p>{stat.label}</p>
                    <h3>{stat.val}</h3>
                 </div>
               ))}
            </div>

            {/* Seção Analítica */}
            <div className="charts-row">
               <div className="chart-box">
                  <h3 className="section-title">Volume por Especialidade Clínica</h3>
                  <div className="mt-6 space-y-4">
                     {monthlyStats.specialtyData.slice(0, 10).map(spec => (
                        <div key={spec.name} className="bar-item">
                           <div className="bar-label">{spec.name}</div>
                           <div className="bar-track">
                              <div className="bar-fill" style={{ width: `${(spec.value / monthlyStats.total) * 100}%` }}></div>
                           </div>
                           <div className="bar-val">{spec.value}</div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="chart-box">
                  <h3 className="section-title">Giro de Atendimento</h3>
                  <div className="fluxo-list mt-6">
                     <div className="fluxo-item">
                        <div className="fluxo-info">
                           <h4>Taxa de Desospitalização</h4>
                           <p>Altas e Transferências em relação ao total</p>
                        </div>
                        <div className="fluxo-tag">{(((monthlyStats.altas + monthlyStats.upa + monthlyStats.externo) / monthlyStats.total) * 100).toFixed(0)}%</div>
                     </div>
                     <div className="fluxo-item">
                        <div className="fluxo-info">
                           <h4>Eficiência de Fluxo</h4>
                           <p>Pacientes sem pendências impeditivas</p>
                        </div>
                        <div className="fluxo-tag">{(((monthlyStats.total - monthlyStats.pendencias) / monthlyStats.total) * 100).toFixed(0)}%</div>
                     </div>
                     <div className="fluxo-item">
                        <div className="fluxo-info">
                           <h4>Absorção da Rede</h4>
                           <p>Pacientes transferidos para UPA/Externo</p>
                        </div>
                        <div className="fluxo-tag">{(((monthlyStats.upa + monthlyStats.externo) / monthlyStats.total) * 100).toFixed(0)}%</div>
                     </div>
                     
                     <div className="mt-8 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <h4 className="text-[9px] font-black text-indigo-900 uppercase mb-2 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Conclusão do Período</h4>
                        <p className="text-[8px] font-bold text-indigo-700 leading-relaxed uppercase">
                           Unidade operou com volume total de {monthlyStats.total} pacientes no mês de {selectedReportMonth}. 
                           A maior demanda concentrou-se na especialidade de {monthlyStats.specialtyData[0]?.name || 'N/A'}. 
                           Meta de giro assistencial atingida em {(((monthlyStats.altas + monthlyStats.internas) / monthlyStats.total) * 100).toFixed(0)}% dos casos.
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Rodapé do Relatório */}
            <div className="report-footer">
               <Activity className="w-8 h-8 text-indigo-900" />
            </div>
          </div>
        </div>
      )}

      {/* MENSAGEM DE LISTA VAZIA */}
      {currentList.length === 0 && (
        <div className="py-24 text-center text-slate-300 font-black uppercase text-xs flex flex-col items-center gap-4">
          <div className="p-6 bg-slate-50 rounded-full">
            <User className="w-12 h-12 opacity-10" />
          </div>
          Nenhum registro para exibir no momento.
        </div>
      )}
    </div>
  );
};

export default TransferManager;
