
import React, { useState, useMemo, useDeferredValue, useCallback, useEffect } from 'react';
import { Patient, Specialty, Role, PatientStatus } from '../types';
import { SPECIALTIES } from '../constants';
import { 
  Search, 
  Printer, 
  Trash2, 
  X, 
  AlertTriangle, 
  User, 
  ChevronRight,
  ShieldAlert,
  HeartPulse,
  Square,
  Activity,
  Stethoscope,
  CheckCircle,
  CheckCircle2,
  MapPin,
  Ban,
  ExternalLink,
  Edit2,
  AlertCircle,
  CheckSquare,
  LogOut,
  Trash,
  Clock,
  History,
  Accessibility,
  Sparkles,
  Syringe,
  FileText,
  Utensils,
  EyeOff,
  EarOff,
  Brain,
  Puzzle,
  Layers,
  CalendarDays
} from 'lucide-react';

const DISABILITY_ICONS: Record<string, any> = {
  visual: EyeOff,
  auditiva: EarOff,
  fisica: Accessibility,
  intelectual: Brain,
  tea: Puzzle,
  multipla: Layers
};

// Função para verificar se o acesso venoso está vencido (> 96 horas)
const isVenousAccessExpired = (access: string) => {
  if (!access) return false;
  const match = access.match(/(\d{1,2})[/-](\d{1,2})/);
  if (!match) return false;
  const day = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const now = new Date();
  const accessDate = new Date(now.getFullYear(), month, day);
  if (accessDate > now) accessDate.setFullYear(now.getFullYear() - 1);
  const diffHours = (now.getTime() - accessDate.getTime()) / (1000 * 60 * 60);
  return diffHours > 96;
};

// Memoized Card Component para evitar lag em listas grandes
const PatientCard = React.memo(({ 
  p, 
  isSelected, 
  onToggle, 
  onClick 
}: { 
  p: Patient, 
  isSelected: boolean, 
  onToggle: (id: string) => void, 
  onClick: (p: Patient) => void 
}) => {
  const isAutoTransfer = p.status === 'Transferência UPA' || p.status === 'Transferência Externa';
  const hasPendencies = p.pendencies !== 'Nenhuma' || !p.hasBracelet || !p.hasBedIdentification;
  const altaWithPendency = p.status === 'Alta' && hasPendencies;
  const venousExpired = isVenousAccessExpired(p.venousAccess || '');
  
  const registrationDate = new Date(p.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div 
      className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all group relative cursor-pointer 
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'} 
        ${altaWithPendency ? 'border-amber-300 bg-amber-50/20' : ''} 
        ${p.hasAllergy ? 'border-purple-300 bg-purple-50/10' : ''} 
        ${isAutoTransfer ? 'ring-2 ring-red-500/50 bg-red-50/5' : ''}`}
      onClick={() => onClick(p)}
    >
      {p.isNew && (
        <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-20 animate-bounce shadow-lg uppercase tracking-widest">
          Novo
        </div>
      )}

      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(p.id); }}
        className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all z-10 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-blue-600'}`}
      >
        {isSelected ? <CheckCircle className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 
          ${altaWithPendency ? 'bg-amber-100 text-amber-600 animate-pulse' : 
          isAutoTransfer ? 'bg-red-100 text-red-600 animate-pulse' : 
          (p.hasAllergy ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600')}`}>
          {altaWithPendency ? <AlertCircle className="w-7 h-7" /> : 
           isAutoTransfer ? <ExternalLink className="w-7 h-7" /> : <User className="w-7 h-7" />}
        </div>
        <div className="overflow-hidden">
          <h4 className="font-black text-slate-800 group-hover:text-blue-600 truncate transition-colors uppercase">{p.name}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prontuário: {p.medicalRecord}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
         <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
            <span className="text-slate-400">Especialidade</span>
            <span className="text-slate-700">{p.specialty}</span>
         </div>
         <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
            <span className="text-slate-400">Status Atual</span>
            <span className={`${altaWithPendency ? 'text-amber-600 font-black' : isAutoTransfer ? 'text-red-600 font-black' : 'text-blue-600'}`}>{p.status}</span>
         </div>
         {altaWithPendency && (
           <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl animate-pulse">
             <AlertTriangle className="w-3.5 h-3.5" />
             <span className="text-[9px] font-black uppercase">Alta com Pendência</span>
           </div>
         )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
         <div className="flex gap-2">
            {p.hasAllergy && <ShieldAlert className="w-4 h-4 text-purple-600" title="Alergia" />}
            {(!p.hasBracelet || !p.hasBedIdentification) && <AlertTriangle className="w-4 h-4 text-red-600" title="Identificação Pendente" />}
            {(p.isTransferRequested || isAutoTransfer) && <HeartPulse className={`w-4 h-4 animate-pulse ${isAutoTransfer ? 'text-red-600' : 'text-orange-500'}`} title="Transferência Solicitada" />}
            {p.hasLesion && <Activity className="w-4 h-4 text-orange-600" title="Lesão Cutânea" />}
            {venousExpired && <Syringe className="w-4 h-4 text-red-600 animate-pulse" title="Acesso Venoso Vencido" />}
         </div>
         <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1 opacity-70">
              <Clock className="w-2.5 h-2.5" />
              {registrationDate}
            </div>
            <div className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
               Detalhes <ChevronRight className="w-3 h-3" />
            </div>
         </div>
      </div>
    </div>
  );
});

interface PatientListProps {
  patients: Patient[];
  role: Role;
  onDeletePatients: (ids: string[]) => void;
  onUpdatePatients: (ids: string[], updates: Partial<Patient>) => void;
  onEdit: (p: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, role, onDeletePatients, onUpdatePatients, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [specFilter, setSpecFilter] = useState<Specialty | 'Todos'>('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  const deferredSearch = useDeferredValue(searchTerm);

  const isAuthorized = role === 'enfermeiro' || role === 'coordenacao';

  // Lógica de limpar notificações para supervisores
  useEffect(() => {
    if (isAuthorized) {
      const newPatientsIds = patients.filter(p => p.isNew && !p.isTransferred).map(p => p.id);
      if (newPatientsIds.length > 0) {
        // Limpa a flag "isNew" após um breve delay para garantir que o menu seja atualizado
        const timer = setTimeout(() => {
          onUpdatePatients(newPatientsIds, { isNew: false });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthorized, patients.length, onUpdatePatients]);

  const filtered = useMemo(() => {
    return patients
      .filter(p => !p.isTransferred)
      .filter(p => 
        p.name.toLowerCase().includes(deferredSearch.toLowerCase()) || 
        p.medicalRecord.includes(deferredSearch)
      )
      .filter(p => specFilter === 'Todos' || p.specialty === specFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, deferredSearch, specFilter]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleCardClick = useCallback((p: Patient) => {
    setActivePatient(p);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const handleBulkDelete = () => {
    if (!isAuthorized) {
      alert("Apenas Enfermeiros ou Coordenação possuem permissão para excluir pacientes.");
      return;
    }
    if (selectedIds.length === 0) return;
    
    if (confirm(`Deseja excluir permanentemente os ${selectedIds.length} registros selecionados? Esta ação não pode ser desfeita.`)) {
      onDeletePatients(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteAll = () => {
    if (!isAuthorized) {
      alert("Acesso negado. Apenas perfis de coordenação ou enfermeiro podem realizar esta ação.");
      return;
    }
    if (confirm(`ATENÇÃO CRÍTICA: Deseja excluir TODOS os ${filtered.length} pacientes listados de uma vez? Esta ação é irreversível.`)) {
      onDeletePatients(filtered.map(p => p.id));
      setSelectedIds([]);
    }
  };

  const handleBulkAlta = () => {
    if (!isAuthorized) {
      alert("Apenas Enfermeiros ou Coordenação possuem permissão para processar alta definitiva.");
      return;
    }
    if (selectedIds.length === 0) return;

    const selectedPatients = patients.filter(p => selectedIds.includes(p.id));
    const withSocialPendency = selectedPatients.find(p => p.pendencies === 'Aguardando Assistente Social');

    if (withSocialPendency) {
      alert(`O paciente ${withSocialPendency.name} possui pendência de Aguardando Assistente Social. É necessário concluir esta pendência antes de finalizar a alta física.`);
      return;
    }

    if (confirm(`Deseja dar ALTA e FINALIZAR os ${selectedIds.length} pacientes selecionados? Eles serão movidos para o Histórico de Finalizados.`)) {
      onUpdatePatients(selectedIds, { 
        status: 'Alta', 
        isTransferred: true, 
        transferredAt: new Date().toISOString() 
      });
      setSelectedIds([]);
    }
  };

  const MarcosAraujoLogo = () => (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
        <Stethoscope className="w-6 h-6 text-emerald-600" />
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-2 h-2 text-amber-500 fill-amber-500" />
        </div>
      </div>
      <div className="text-left">
        <span className="block text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Marcos</span>
        <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-0.5 leading-none">Araújo</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controles da Lista */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm no-print">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou prontuário..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
           <select 
             className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
             value={specFilter}
             onChange={e => setSpecFilter(e.target.value as any)}
           >
             <option value="Todos">Todas Especialidades</option>
             {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
           </select>

           <button 
             onClick={toggleSelectAll}
             className={`p-3 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-2 font-black text-[10px] uppercase ${selectedIds.length === filtered.length && filtered.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
             title="Selecionar Todos"
           >
             <CheckSquare className="w-5 h-5" />
             <span className="hidden sm:inline">Todos</span>
           </button>

           {isAuthorized && filtered.length > 0 && (
              <button 
                onClick={handleDeleteAll}
                className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 border border-red-100"
                title="Excluir Todos os Listados"
              >
                <Trash className="w-5 h-5" />
              </button>
           )}

           <button 
             onClick={() => window.print()}
             className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
             title="Gerar Relatório de Impressão"
           >
             <Printer className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Barra de Ação em Massa */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
              {selectedIds.length} selecionado(s)
            </div>
            <button onClick={() => setSelectedIds([])} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase">Desmarcar</button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkAlta}
              disabled={!isAuthorized}
              className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 ${!isAuthorized ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <LogOut className="w-4 h-4" /> Alta e Finalizar
            </button>
            {isAuthorized && (
              <button 
                onClick={handleBulkDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid de Pacientes (Interface) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {filtered.map(p => (
          <PatientCard 
            key={p.id} 
            p={p} 
            isSelected={selectedIds.includes(p.id)} 
            onToggle={toggleSelect} 
            onClick={handleCardClick}
          />
        ))}
        
        {filtered.length === 0 && (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
             <Stethoscope className="w-16 h-16 opacity-10 mb-4" />
             <p className="font-black uppercase tracking-widest text-xs">Nenhum paciente encontrado na unidade</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes Completo */}
      {activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 border border-white/20">
            {/* CABEÇALHO DO MODAL */}
            <div className={`p-6 md:p-8 text-white flex justify-between items-start shrink-0 rounded-t-[2.5rem] ${activePatient.status === 'Alta' ? 'bg-amber-600' : activePatient.status.includes('Transferência') ? 'bg-red-600' : (activePatient.hasAllergy ? 'bg-purple-600' : 'bg-blue-700')}`}>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
                  <User className="w-10 h-10 md:w-14 md:h-14" />
                </div>
                <div>
                   <h3 className="text-xl md:text-4xl font-black tracking-tighter uppercase leading-tight drop-shadow-md">
                    {activePatient.name}
                   </h3>
                   {activePatient.socialName && (
                     <p className="text-white/90 font-black uppercase text-xs md:text-sm tracking-[0.2em] mt-1 bg-white/10 px-3 py-1 rounded-lg inline-block">
                        Nome Social: {activePatient.socialName}
                     </p>
                   )}
                   <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Prontuário: {activePatient.medicalRecord}
                     </span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5" /> {activePatient.age} anos
                     </span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest">
                        Sexo: {activePatient.sex?.toUpperCase()}
                     </span>
                     <span className={`px-2 py-0.5 rounded font-black text-[10px] tracking-widest ${activePatient.status === 'Internado' ? 'bg-emerald-500' : 'bg-white/20'}`}>
                        {activePatient.status.toUpperCase()}
                     </span>
                   </div>
                </div>
              </div>
              <button onClick={() => setActivePatient(null)} className="p-3 hover:bg-white/20 rounded-full transition-all active:scale-90">
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* CORPO DO MODAL - SCROLLABLE */}
            <div className="p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
               
               {/* GRID DE INFORMAÇÕES GERAIS */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* BLOCO: LOCALIZAÇÃO E IDENTIFICAÇÃO */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Localização & Identificação</h4>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor / Corredor</p>
                           <p className="font-bold text-slate-800 text-sm uppercase">{activePatient.corridor}</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Acomodação Atual</p>
                           <p className="font-bold text-slate-800 text-sm uppercase">{activePatient.situation}</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm col-span-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Protocolo de Identificação Segura</p>
                           <div className="flex justify-around items-center">
                              <span className={`text-[10px] font-black uppercase flex items-center gap-2 px-4 py-2 rounded-xl ${activePatient.hasBracelet ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                                 {activePatient.hasBracelet ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} Pulseira ID
                              </span>
                              <span className={`text-[10px] font-black uppercase flex items-center gap-2 px-4 py-2 rounded-xl ${activePatient.hasBedIdentification ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                                 {activePatient.hasBedIdentification ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} Beira Leito
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* BLOCO: DIAGNÓSTICO E GESTÃO */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                        <Stethoscope className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Diagnóstico & Gestão</h4>
                     </div>
                     <div className="space-y-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico Clínico</p>
                           <p className="font-black text-slate-800 text-base uppercase leading-tight">{activePatient.diagnosis || 'NÃO INFORMADO'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialidade</p>
                              <p className="font-bold text-slate-800 text-sm uppercase">{activePatient.specialty}</p>
                           </div>
                           <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Autorização (AIH)</p>
                              <p className={`font-black text-sm uppercase ${activePatient.hasAIH ? 'text-emerald-600' : 'text-red-500'}`}>
                                 {activePatient.hasAIH ? 'POSSUI AIH ATIVA' : 'SEM AIH CADASTRADA'}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* SEÇÃO: ASSISTÊNCIA DE ENFERMAGEM */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 border-l-4 border-emerald-600 pl-3">
                     <Activity className="w-5 h-5 text-emerald-600" />
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Assistência & Cuidados Imediatos</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className={`p-5 rounded-3xl border shadow-sm transition-all ${isVenousAccessExpired(activePatient.venousAccess || '') ? 'bg-red-50 border-red-500' : 'bg-white border-slate-200'}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isVenousAccessExpired(activePatient.venousAccess || '') ? 'text-red-700' : 'text-slate-400'}`}>Acesso Venoso</p>
                        <div className="flex items-center gap-2">
                           <Syringe className={`w-4 h-4 ${isVenousAccessExpired(activePatient.venousAccess || '') ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`} />
                           <p className={`font-bold text-sm uppercase truncate ${isVenousAccessExpired(activePatient.venousAccess || '') ? 'text-red-900' : 'text-slate-800'}`}>{activePatient.venousAccess || 'NENHUM'}</p>
                        </div>
                        {isVenousAccessExpired(activePatient.venousAccess || '') && (
                           <p className="text-[8px] font-black text-red-600 mt-1 uppercase animate-pulse">TROCA NECESSÁRIA (96H)</p>
                        )}
                     </div>
                     <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobilidade</p>
                        <div className="flex items-center gap-2">
                           <Accessibility className="w-4 h-4 text-emerald-600" />
                           <p className="font-bold text-slate-800 text-sm uppercase">{activePatient.mobility}</p>
                        </div>
                     </div>
                     <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prescrição Médica</p>
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className={`w-4 h-4 ${activePatient.hasPrescription ? 'text-emerald-600' : 'text-red-500'}`} />
                           <p className={`font-black text-sm uppercase ${activePatient.hasPrescription ? 'text-emerald-700' : 'text-red-600'}`}>
                              {activePatient.hasPrescription ? 'ATIVA' : 'AUSENTE'}
                           </p>
                        </div>
                     </div>
                     <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dieta Prescrita</p>
                        <div className="flex flex-wrap gap-1">
                           {activePatient.diet && activePatient.diet.length > 0 ? activePatient.diet.map(d => (
                              <span key={d} className="bg-indigo-50 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">{d}</span>
                           )) : (
                              <span className="text-slate-400 text-[10px] font-bold italic uppercase">Sem dieta registrada</span>
                           )}
                        </div>
                     </div>
                  </div>
                  
                  {/* PENDÊNCIAS EM DESTAQUE */}
                  {activePatient.pendencies !== 'Nenhuma' && (
                     <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-200 flex items-center gap-4 animate-pulse">
                        <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                        <div>
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Pendência de Fluxo Detectada</p>
                           <p className="font-black text-amber-900 text-lg uppercase tracking-tight">{activePatient.pendencies}</p>
                        </div>
                     </div>
                  )}
               </section>

               {/* SEÇÃO: ALERTAS CRÍTICOS E DEFICIÊNCIAS */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 border-l-4 border-red-600 pl-3">
                     <AlertCircle className="w-5 h-5 text-red-600" />
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Alertas Críticos & Deficiências</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {/* ALERGIA */}
                     <div className={`p-6 rounded-[2rem] border transition-all ${activePatient.hasAllergy ? 'bg-purple-50 border-purple-200 shadow-md' : 'bg-white border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`p-3 rounded-2xl ${activePatient.hasAllergy ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <ShieldAlert className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alergias</p>
                              <p className={`text-sm font-black uppercase ${activePatient.hasAllergy ? 'text-purple-700' : 'text-slate-500'}`}>
                                 {activePatient.hasAllergy ? 'CRÍTICO' : 'NÃO POSSUI'}
                              </p>
                           </div>
                        </div>
                        {activePatient.hasAllergy && (
                           <p className="text-xs font-bold text-purple-900 bg-white/60 p-3 rounded-xl uppercase leading-relaxed">
                              {activePatient.allergyDetails}
                           </p>
                        )}
                     </div>

                     {/* LESÃO POR PRESSÃO */}
                     <div className={`p-6 rounded-[2rem] border transition-all ${activePatient.hasLesion ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-white border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`p-3 rounded-2xl ${activePatient.hasLesion ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Activity className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lesão Cutânea</p>
                              <p className={`text-sm font-black uppercase ${activePatient.hasLesion ? 'text-amber-700' : 'text-slate-500'}`}>
                                 {activePatient.hasLesion ? 'DETECTADA' : 'NÃO POSSUI'}
                              </p>
                           </div>
                        </div>
                        {activePatient.hasLesion && (
                           <p className="text-xs font-bold text-amber-900 bg-white/60 p-3 rounded-xl uppercase leading-relaxed">
                              {activePatient.lesionDescription}
                           </p>
                        )}
                     </div>

                     {/* DEFICIÊNCIAS */}
                     <div className={`p-6 rounded-[2rem] border transition-all ${activePatient.disabilities && activePatient.disabilities.length > 0 ? 'bg-emerald-50 border-emerald-200 shadow-md' : 'bg-white border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`p-3 rounded-2xl ${activePatient.disabilities && activePatient.disabilities.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Accessibility className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deficiências</p>
                              <p className={`text-sm font-black uppercase ${activePatient.disabilities && activePatient.disabilities.length > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                 {activePatient.disabilities && activePatient.disabilities.length > 0 ? 'NOTIFICADAS' : 'AUSENTES'}
                              </p>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {activePatient.disabilities?.map(id => {
                              const Icon = DISABILITY_ICONS[id] || Accessibility;
                              return (
                                 <div key={id} className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                                    <Icon className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[9px] font-black uppercase text-emerald-800">{id}</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </section>

               {/* SEÇÃO: OBSERVAÇÕES IMPORTANTES */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 border-l-4 border-slate-800 pl-3">
                     <AlertCircle className="w-5 h-5 text-slate-800" />
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Observações do Plantão</h4>
                  </div>
                  <div className="bg-slate-800 p-8 rounded-[2.5rem] shadow-xl text-white">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Informações de Passagem de Turno</p>
                     <p className="font-bold text-sm leading-relaxed uppercase italic">
                        {activePatient.notes || "NÃO HÁ OBSERVAÇÕES REGISTRADAS PARA ESTE PACIENTE."}
                     </p>
                  </div>
               </section>

               {/* RODAPÉ DE RASTREABILIDADE */}
               <footer className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-100">
                     <History className="w-5 h-5" />
                     <div className="space-y-0.5">
                        <p>REGISTRO INICIAL EM {new Date(activePatient.createdAt).toLocaleString('pt-BR')}</p>
                        <p>CADASTRADO POR: <span className="text-blue-600">{activePatient.createdBy}</span></p>
                     </div>
                  </div>
                  <div className="text-center md:text-right space-y-1">
                     <p>ÚLTIMA MODIFICAÇÃO PELO USUÁRIO:</p>
                     <p className="text-slate-800 text-[11px]">{activePatient.lastModifiedBy || activePatient.createdBy}</p>
                  </div>
               </footer>

            </div>

            {/* AÇÕES FINAIS DO MODAL */}
            <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-4 no-print">
               <button 
                 onClick={() => { onEdit(activePatient); setActivePatient(null); }} 
                 className="flex-1 py-5 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-3xl hover:bg-slate-50 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-sm active:scale-95"
               >
                 <Edit2 className="w-5 h-5" /> Editar Cadastro
               </button>
               <button 
                 onClick={() => setActivePatient(null)} 
                 className="flex-[2] py-5 bg-blue-700 text-white font-black rounded-3xl shadow-2xl hover:bg-blue-800 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3"
               >
                 <CheckCircle className="w-6 h-6" /> Concluir Visão do Paciente
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RELATÓRIO PARA IMPRESSÃO (A4) --- */}
      <div className="hidden print:block bg-white text-slate-950 p-0 font-sans">
        <style>{`
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; background: white !important; }
          
          /* Evita cortes de texto no topo e rodapé da página */
          .print-container { 
            width: 210mm; 
            margin: 0 auto; 
            background: white; 
            padding-bottom: 50px; /* Margem para o rodapé fixo */
          }

          .print-header { 
            border-bottom: 3px solid #0f172a; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
          }

          .print-table { 
            width: 100%; 
            border-collapse: collapse; 
            border: 1.5px solid #334155; 
            table-layout: fixed; /* Força o respeito às larguras definidas */
          }

          /* Títulos das Colunas (Cabeçalho com fundo azul suave) */
          .print-table thead {
            display: table-header-group; /* Faz o cabeçalho repetir em todas as páginas */
          }

          .print-table th { 
            background-color: #f0f9ff !important; /* Azul suave */
            border: 1px solid #94a3b8; 
            padding: 8px 4px; 
            text-align: center; 
            font-size: 7.5px; 
            text-transform: uppercase; 
            font-weight: 900; 
            color: #1e40af; /* Texto azul escuro */
          }

          /* Células de Conteúdo */
          .print-table td { 
            border: 1px solid #cbd5e1; 
            padding: 8px 4px; 
            font-size: 7.5px; 
            vertical-align: middle; 
            word-wrap: break-word;
            font-weight: 600;
          }

          /* Zebra e Efeito de Quebra */
          .print-table tr {
            break-inside: avoid; /* Impede que uma linha seja cortada entre páginas */
          }
          .print-table tr:nth-child(even) { 
            background-color: #f8fafc !important; 
          }

          .print-footer { 
            position: fixed;
            bottom: 0;
            left: 15mm;
            right: 15mm;
            border-top: 2px solid #e2e8f0; 
            padding-top: 10px; 
            padding-bottom: 10px;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            background: white;
            height: 40px;
          }

          .alert-badge { 
            font-weight: 900; 
            color: #dc2626; 
            font-size: 6.5px; 
            display: block; 
            margin-bottom: 1px; 
            line-height: 1.1;
          }

          .status-highlight {
            font-weight: 900;
            color: #1e40af;
          }

          .badge-special {
            background-color: #f1f5f9;
            border: 0.5px solid #cbd5e1;
            padding: 1px 2px;
            border-radius: 2px;
          }
        `}</style>
        
        <div className="print-container">
          <div className="print-header">
             <div className="flex items-center gap-3">
                <Activity className="w-10 h-10 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900">HospFlow</h1>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Gestão de Unidade Assistencial</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Emissão de Relatório</p>
                <p className="font-bold text-xs text-slate-800">{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</p>
             </div>
          </div>

          <div className="mb-4 bg-slate-900 text-white p-2 rounded-lg inline-block">
            <h3 className="text-[10px] font-black uppercase tracking-widest px-2">Lista Ativa de Pacientes • {filtered.length} Registros</h3>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>PACIENTE (NOME/SOCIAL)</th>
                <th style={{ width: '5%' }}>IDADE</th>
                <th style={{ width: '9%' }}>PRONTUÁRIO</th>
                <th style={{ width: '12%' }}>ESPECIALIDADE</th>
                <th style={{ width: '8%' }}>ACOMOD.</th>
                <th style={{ width: '10%' }}>STATUS</th>
                <th style={{ width: '16%' }}>LOCALIZAÇÃO</th>
                <th style={{ width: '18%' }}>ALERTAS/PENDÊNCIAS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="text-left px-3">
                    <div className="font-black uppercase text-slate-900 leading-tight">{p.name}</div>
                    {p.socialName && <div className="text-slate-500 text-[6.5px] italic font-bold">Social: {p.socialName}</div>}
                  </td>
                  <td className="text-center font-black">{p.age}a</td>
                  <td className="text-center font-mono font-bold text-slate-700">{p.medicalRecord}</td>
                  <td className="text-center font-black uppercase">{p.specialty}</td>
                  <td className="text-center font-black uppercase">{p.situation}</td>
                  <td className="text-center font-black uppercase text-blue-700">{p.status}</td>
                  <td className="text-center text-[7px] uppercase font-bold leading-tight px-2">{p.corridor}</td>
                  <td className="px-3">
                    <div className="space-y-1">
                      {p.hasAllergy && <span className="alert-badge text-purple-700">● ALERGIA: {p.allergyDetails}</span>}
                      {p.hasLesion && <span className="alert-badge text-amber-600">● LESÃO: {p.lesionDescription}</span>}
                      {isVenousAccessExpired(p.venousAccess || '') && <span className="alert-badge text-red-600 animate-pulse">● ACESSO VENCIDO (96H)</span>}
                      {(!p.hasBracelet || !p.hasBedIdentification) && <span className="alert-badge">● FALHA IDENTIFICAÇÃO</span>}
                      {p.pendencies !== 'Nenhuma' && <span className="alert-badge text-slate-700 font-bold italic">● {p.pendencies.toUpperCase()}</span>}
                      {p.disabilities && p.disabilities.length > 0 && (
                        <span className="alert-badge text-emerald-700">● DEFICIÊNCIA: {p.disabilities.join(', ').toUpperCase()}</span>
                      )}
                      {!p.hasAllergy && !p.hasLesion && p.pendencies === 'Nenhuma' && !isVenousAccessExpired(p.venousAccess || '') && (
                        <span className="text-[6.5px] text-emerald-600 font-black uppercase tracking-tight">Sem Pendências Críticas</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-footer">
             <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                <p>Relatório Gerado por: {role.toUpperCase()} • Sistema HospFlow v3.2</p>
                <p className="mt-1">Documento Assistencial de Uso Restrito</p>
             </div>
             
             <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Marcos Araújo</span>
                  <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1 leading-none">Gestão em Saúde</span>
                </div>
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                  <Stethoscope className="w-5 h-5 text-emerald-600" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientList;
