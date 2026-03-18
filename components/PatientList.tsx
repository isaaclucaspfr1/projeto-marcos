
import React, { useState, useMemo, useDeferredValue, useCallback, useEffect } from 'react';
import { Patient, Specialty, Role } from '../types';
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
  Activity,
  Square,
  CheckCircle,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckSquare,
  LogOut,
  UserMinus,
  Clock,
  Accessibility,
  Syringe,
  EyeOff,
  EarOff,
  Brain,
  Puzzle,
  Layers,
  Stethoscope,
  Sparkles
} from 'lucide-react';

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
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
         <div className="flex gap-2">
            {p.hasAllergy && <ShieldAlert className="w-4 h-4 text-purple-600" />}
            {(!p.hasBracelet || !p.hasBedIdentification) && <AlertTriangle className="w-4 h-4 text-red-600" />}
            {(p.isTransferRequested || isAutoTransfer) && <Activity className={`w-4 h-4 animate-pulse ${isAutoTransfer ? 'text-red-600' : 'text-orange-500'}`} />}
            {p.hasLesion && <Activity className="w-4 h-4 text-orange-600" />}
            {venousExpired && <Syringe className="w-4 h-4 text-red-600 animate-pulse" />}
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

  // Otimização: deferredSearch evita travamentos no teclado enquanto filtra a lista grande
  const deferredSearch = useDeferredValue(searchTerm);
  const isAuthorized = role === 'enfermeiro' || role === 'coordenacao';

  useEffect(() => {
    if (isAuthorized) {
      const newPatientsIds = patients.filter(p => p.isNew && !p.isTransferred).map(p => p.id);
      if (newPatientsIds.length > 0) {
        const timer = setTimeout(() => {
          onUpdatePatients(newPatientsIds, { isNew: false });
        }, 1500);
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

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  }, [selectedIds.length, filtered]);

  const handleBulkDelete = useCallback(() => {
    if (!isAuthorized) return;
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja excluir ${selectedIds.length} registros?`)) {
      onDeletePatients(selectedIds);
      setSelectedIds([]);
    }
  }, [isAuthorized, selectedIds, onDeletePatients]);

  const handleBulkAlta = useCallback(() => {
    if (!isAuthorized || selectedIds.length === 0) return;
    if (confirm(`Deseja dar ALTA aos ${selectedIds.length} pacientes?`)) {
      onUpdatePatients(selectedIds, { 
        status: 'Alta', 
        isTransferred: true, 
        transferredAt: new Date().toISOString() 
      });
      setSelectedIds([]);
    }
  }, [isAuthorized, selectedIds, onUpdatePatients]);

  const handleBulkEvasao = useCallback(() => {
    if (!isAuthorized || selectedIds.length === 0) return;
    if (confirm(`Deseja registrar EVASÃO para os ${selectedIds.length} pacientes?`)) {
      onUpdatePatients(selectedIds, { 
        status: 'Evasão', 
        isTransferred: true, 
        transferredAt: new Date().toISOString() 
      });
      setSelectedIds([]);
    }
  }, [isAuthorized, selectedIds, onUpdatePatients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm no-print">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <select 
             className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase"
             value={specFilter}
             onChange={e => setSpecFilter(e.target.value as any)}
           >
             <option value="Todos">Todas Especialidades</option>
             {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <button onClick={toggleSelectAll} className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
             <CheckSquare className="w-5 h-5" />
           </button>
           <button onClick={() => window.print()} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
             <Printer className="w-5 h-5" />
           </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex items-center justify-between no-print">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{selectedIds.length} selecionado(s)</span>
          <div className="flex gap-2">
            <button onClick={handleBulkAlta} disabled={!isAuthorized} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2"><LogOut className="w-4 h-4" /> Alta</button>
            <button onClick={handleBulkEvasao} disabled={!isAuthorized} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2"><UserMinus className="w-4 h-4" /> Evasão</button>
            {isAuthorized && <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2"><Trash2 className="w-4 h-4" /> Excluir</button>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {filtered.map(p => (
          <PatientCard 
            key={p.id} 
            p={p} 
            isSelected={selectedIds.includes(p.id)} 
            onToggle={toggleSelect} 
            onClick={setActivePatient}
          />
        ))}
      </div>

      {activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in no-print">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in border border-white/20">
            <div className={`p-6 text-white flex justify-between items-start rounded-t-[2.5rem] ${activePatient.status === 'Alta' ? 'bg-amber-600' : (activePatient.hasAllergy ? 'bg-purple-600' : 'bg-blue-700')}`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center"><User className="w-10 h-10" /></div>
                <div>
                   <h3 className="text-xl md:text-3xl font-black uppercase tracking-tight">{activePatient.name}</h3>
                   {activePatient.socialName && (
                     <p className="text-white/70 font-black uppercase text-xs tracking-widest mt-1">Nome Social: {activePatient.socialName}</p>
                   )}
                   <div className="flex flex-wrap gap-4 mt-2">
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest bg-white/10 px-2 py-1 rounded-lg">Prontuário: {activePatient.medicalRecord}</span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest bg-white/10 px-2 py-1 rounded-lg">Idade: {activePatient.age} anos</span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest bg-white/10 px-2 py-1 rounded-lg">Sexo: {activePatient.sex}</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setActivePatient(null)} className="p-3 hover:bg-white/20 rounded-full transition-all active:scale-90"><X className="w-8 h-8" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-8">
               {/* ALERTAS CRÍTICOS */}
               {(activePatient.hasAllergy || activePatient.hasLesion || !activePatient.hasBracelet || !activePatient.hasBedIdentification || activePatient.pendencies !== 'Nenhuma') && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePatient.hasAllergy && (
                      <div className="bg-purple-100 border-2 border-purple-300 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
                        <ShieldAlert className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Alergia Detectada</p>
                          <p className="font-black text-purple-900 uppercase text-sm">{activePatient.allergyDetails || 'SIM'}</p>
                        </div>
                      </div>
                    )}
                    {activePatient.hasLesion && (
                      <div className="bg-orange-100 border-2 border-orange-300 p-4 rounded-3xl flex items-center gap-4">
                        <Activity className="w-8 h-8 text-orange-600" />
                        <div>
                          <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Lesão Cutânea</p>
                          <p className="font-black text-orange-900 uppercase text-sm">{activePatient.lesionDescription || 'SIM'}</p>
                        </div>
                      </div>
                    )}
                    {!activePatient.hasBracelet && (
                      <div className="bg-red-100 border-2 border-red-300 p-4 rounded-3xl flex items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Segurança</p>
                          <p className="font-black text-red-900 uppercase text-sm">Sem Pulseira de Identificação</p>
                        </div>
                      </div>
                    )}
                    {!activePatient.hasBedIdentification && (
                      <div className="bg-red-100 border-2 border-red-300 p-4 rounded-3xl flex items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Segurança</p>
                          <p className="font-black text-red-900 uppercase text-sm">Sem Identificação de Leito</p>
                        </div>
                      </div>
                    )}
                    {activePatient.pendencies !== 'Nenhuma' && (
                      <div className="bg-amber-100 border-2 border-amber-300 p-4 rounded-3xl flex items-center gap-4">
                        <Clock className="w-8 h-8 text-amber-600" />
                        <div>
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pendência Atual</p>
                          <p className="font-black text-amber-900 uppercase text-sm">{activePatient.pendencies}</p>
                        </div>
                      </div>
                    )}
                 </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* COLUNA 1: LOCALIZAÇÃO E STATUS */}
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                           <MapPin className="w-5 h-5 text-blue-600" />
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Localização e Fluxo</h4>
                        </div>
                        <div className="space-y-3">
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor / Corredor</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{activePatient.corridor}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Situação</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{activePatient.situation}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Paciente</p>
                              <p className="font-black text-blue-600 text-xs uppercase">{activePatient.status}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialidade</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{activePatient.specialty}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Possui AIH?</p>
                              <p className={`font-black text-xs uppercase ${activePatient.hasAIH ? 'text-emerald-600' : 'text-red-600'}`}>{activePatient.hasAIH ? 'SIM' : 'NÃO'}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* COLUNA 2: DADOS CLÍNICOS */}
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                           <Activity className="w-5 h-5 text-indigo-600" />
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dados Clínicos</h4>
                        </div>
                        <div className="space-y-3">
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico Principal</p>
                              <p className="font-black text-slate-800 text-xs uppercase leading-tight">{activePatient.diagnosis || 'NÃO INFORMADO'}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobilidade</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{activePatient.mobility}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Acesso Venoso</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{activePatient.venousAccess || 'NÃO INFORMADO'}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* COLUNA 3: PRESCRIÇÃO E DIETA */}
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-emerald-600 pl-3">
                           <Stethoscope className="w-5 h-5 text-emerald-600" />
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Assistência</h4>
                        </div>
                        <div className="space-y-3">
                           <div className={`p-4 rounded-2xl border ${activePatient.hasPrescription ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Prescrição Médica</p>
                              <p className={`font-black text-xs uppercase ${activePatient.hasPrescription ? 'text-emerald-700' : 'text-red-700'}`}>{activePatient.hasPrescription ? 'VÁLIDA / ATIVA' : 'AUSENTE / VENCIDA'}</p>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Dieta</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                 {activePatient.diet && activePatient.diet.length > 0 ? (
                                   activePatient.diet.map(d => (
                                     <span key={d} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">{d}</span>
                                   ))
                                 ) : (
                                   <span className="text-slate-400 text-[9px] font-black uppercase italic">NÃO INFORMADA</span>
                                 )}
                              </div>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações / Notas</p>
                              <p className="text-slate-600 text-[10px] font-bold uppercase leading-relaxed whitespace-pre-wrap">{activePatient.notes || 'SEM OBSERVAÇÕES'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
               <footer className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <p>REGISTRO EM {new Date(activePatient.createdAt).toLocaleString('pt-BR')}</p>
                  <p>POR: <span className="text-blue-600">{activePatient.createdBy}</span></p>
               </footer>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-4">
               <button onClick={() => { onEdit(activePatient); setActivePatient(null); }} className="flex-1 min-w-[120px] py-4 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-3xl uppercase text-xs tracking-widest">Editar</button>
               
               {isAuthorized && (
                 <>
                   <button 
                     onClick={() => {
                       if (confirm('Confirmar ALTA deste paciente?')) {
                         onUpdatePatients([activePatient.id], { 
                           status: 'Alta', 
                           isTransferred: true, 
                           transferredAt: new Date().toISOString() 
                         });
                         setActivePatient(null);
                       }
                     }} 
                     className="flex-1 min-w-[120px] py-4 bg-blue-600 text-white font-black rounded-3xl shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                   >
                     <LogOut className="w-4 h-4" /> Alta
                   </button>
                   
                   <button 
                     onClick={() => {
                       if (confirm('Confirmar EVASÃO deste paciente?')) {
                         onUpdatePatients([activePatient.id], { 
                           status: 'Evasão', 
                           isTransferred: true, 
                           transferredAt: new Date().toISOString() 
                         });
                         setActivePatient(null);
                       }
                     }} 
                     className="flex-1 min-w-[120px] py-4 bg-amber-600 text-white font-black rounded-3xl shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                   >
                     <UserMinus className="w-4 h-4" /> Evasão
                   </button>
                   
                   <button 
                     onClick={() => {
                       if (confirm('Deseja EXCLUIR permanentemente este registro?')) {
                         onDeletePatients([activePatient.id]);
                         setActivePatient(null);
                       }
                     }} 
                     className="flex-1 min-w-[120px] py-4 bg-red-600 text-white font-black rounded-3xl shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                   >
                     <Trash2 className="w-4 h-4" /> Excluir
                   </button>
                 </>
               )}
               
               <button onClick={() => setActivePatient(null)} className="flex-1 min-w-[120px] py-4 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase text-xs tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Relatório Impresso Padronizado (HospFlow Estilo Consolidado) */}
      <div className="hidden print:block bg-white text-slate-950 p-0 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '15mm' }}>
        <style>{`
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; background: white !important; }
          .print-header { border-bottom: 4px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .print-title { color: #1e3a8a; font-size: 36px; font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: -1px; }
          .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .print-table th { background-color: #f8fafc !important; border: 1.5px solid #334155; padding: 12px 8px; font-size: 10px; text-transform: uppercase; font-weight: 900; text-align: left; color: #334155; }
          .print-table td { border: 1px solid #e2e8f0; padding: 10px 8px; font-size: 10px; font-weight: 600; color: #0f172a; }
          .print-footer { border-top: 2px solid #e2e8f0; padding-top: 15px; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; }
        `}</style>
        
        <div className="print-header">
           <div className="flex items-center gap-4">
              <Activity className="w-14 h-14 text-[#1e3a8a]" />
              <h1 className="print-title">HospFlow</h1>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Censo Assistencial em Tempo Real</p>
              <p className="font-bold text-sm text-slate-900">{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</p>
           </div>
        </div>

        <div className="mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Resumo da Unidade</p>
           <div className="grid grid-cols-3 gap-8">
              <div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Total Pacientes</p>
                 <p className="text-2xl font-black text-blue-900">{filtered.length}</p>
              </div>
              <div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Especialidade Filtrada</p>
                 <p className="text-lg font-black text-slate-800">{specFilter}</p>
              </div>
              <div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Emitido por</p>
                 <p className="text-xs font-black text-slate-700 uppercase">{role}</p>
              </div>
           </div>
        </div>
        
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>NOME DO PACIENTE / ALERTAS</th>
              <th style={{ width: '15%' }}>PRONTUÁRIO</th>
              <th style={{ width: '20%' }}>ESPECIALIDADE</th>
              <th style={{ width: '25%' }}>SITUAÇÃO / SETOR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                   <div className="font-black uppercase text-[11px]">{p.name}</div>
                   <div className="flex gap-2 mt-1">
                      {p.hasAllergy && <span className="text-[8px] font-black text-purple-600 uppercase border border-purple-200 px-1 rounded">ALERGIA</span>}
                      {p.hasLesion && <span className="text-[8px] font-black text-orange-600 uppercase border border-orange-200 px-1 rounded">LESÃO</span>}
                   </div>
                </td>
                <td className="font-mono text-center text-blue-900 font-black">{p.medicalRecord}</td>
                <td className="uppercase text-slate-600 font-bold">{p.specialty}</td>
                <td className="uppercase text-blue-900 font-black">
                   <div className="text-[10px]">{p.status}</div>
                   <div className="text-[8px] text-slate-500">{p.corridor}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              HospFlow • Gestão Assistencial Segura
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
        </div>
      </div>
    </div>
  );
};

export default PatientList;
