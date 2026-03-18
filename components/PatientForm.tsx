
import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Corridor, Specialty, PatientStatus, PendencyType, DietType } from '../types';
import { CORRIDORS, SPECIALTIES, PATIENT_STATUSES, PENDENCIES, DIETS } from '../constants';
import { 
  Save, 
  AlertCircle, 
  ClipboardCheck, 
  EyeOff, 
  EarOff, 
  Accessibility, 
  Brain, 
  Puzzle, 
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Syringe,
  FileText,
  Utensils,
  Ban,
  User,
  ShieldAlert,
  Calendar,
  Clock
} from 'lucide-react';

interface PatientFormProps {
  onSave: (patient: Partial<Patient>) => void;
  onCancel: () => void;
  initialData?: Partial<Patient>;
}

const DISABILITY_OPTIONS = [
  { id: 'visual', label: 'Visual', icon: EyeOff },
  { id: 'auditiva', label: 'Auditiva', icon: EarOff },
  { id: 'fisica', label: 'Física', icon: Accessibility },
  { id: 'intelectual', label: 'Intelectual', icon: Brain },
  { id: 'tea', label: 'TEA', icon: Puzzle },
  { id: 'multipla', label: 'Múltipla', icon: Layers },
];

const INITIAL_STATE: Partial<Patient> = {
  name: '',
  socialName: '',
  sex: 'Masculino',
  age: undefined,
  medicalRecord: '',
  corridor: 'Corredor 1 | Principal',
  specialty: 'Cirurgia Geral',
  status: 'Internado',
  hasAIH: true,
  pendencies: 'Nenhuma',
  diagnosis: '',
  mobility: 'Deambula',
  hasAllergy: false,
  allergyDetails: '',
  venousAccess: '',
  hasPrescription: true,
  diet: [],
  disabilities: [],
  notes: '',
  hasBracelet: false,
  hasBedIdentification: false,
  situation: 'Maca',
  hasLesion: false,
  lesionDescription: '',
};

// Função para verificar se o acesso venoso está vencido (> 96 horas)
const isVenousAccessExpired = (access: string) => {
  if (!access) return false;
  // Regex para encontrar DD/MM ou DD-MM
  const match = access.match(/(\d{1,2})[/-](\d{1,2})/);
  if (!match) return false;

  const day = parseInt(match[1]);
  const month = parseInt(match[2]) - 1; // Meses em JS são 0-indexed
  const now = new Date();
  const accessDate = new Date(now.getFullYear(), month, day);

  // Se a data construída for futura, assumimos que é do ano anterior
  if (accessDate > now) {
    accessDate.setFullYear(now.getFullYear() - 1);
  }

  const diffMs = now.getTime() - accessDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours > 96; // 96 horas = 4 dias
};

const PatientForm: React.FC<PatientFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Patient>>(INITIAL_STATE);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ 
        ...prev, 
        ...initialData,
        age: initialData.age || undefined,
        disabilities: initialData.disabilities || []
      }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Se for um novo cadastro (sem ID inicial), limpa e volta ao topo
    if (!initialData || !initialData.id) {
      setFormData(INITIAL_STATE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert("Paciente cadastrado com sucesso! Formulário pronto para o próximo registro.");
    }
  };

  const toggleDisability = (id: string) => {
    const current = formData.disabilities || [];
    if (current.includes(id)) {
      setFormData({ ...formData, disabilities: current.filter(item => item !== id) });
    } else {
      setFormData({ ...formData, disabilities: [...current, id] });
    }
  };

  const toggleDiet = (diet: DietType) => {
    const current = formData.diet || [];
    if (current.includes(diet)) {
      setFormData({ ...formData, diet: current.filter(item => item !== diet) });
    } else {
      setFormData({ ...formData, diet: [...current, diet] });
    }
  };

  const handlePendencyChange = (val: PendencyType) => {
    let updates: Partial<Patient> = { pendencies: val };
    if (val === 'Sem prescrição médica') updates.hasPrescription = false;
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const venousExpired = useMemo(() => isVenousAccessExpired(formData.venousAccess || ''), [formData.venousAccess]);

  return (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-300 pb-16">
      <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-[3rem] border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ClipboardCheck className="w-8 h-8 text-blue-500" />
            <h3 className="text-2xl font-black uppercase tracking-tighter">
              {initialData && initialData.id ? 'Edição de Cadastro' : 'Novo Registro Assistencial'}
            </h3>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-12">
          
          {/* I. IDENTIFICAÇÃO DO PACIENTE */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">I. Identificação do Paciente</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Paciente</label>
                <input required type="text" className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-black text-slate-800" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Social</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-black text-slate-800" value={formData.socialName} onChange={e => setFormData({ ...formData, socialName: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value as any })}>
                  <option value="Masculino">MASCULINO</option>
                  <option value="Feminino">FEMININO</option>
                  <option value="Outro">OUTRO</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</label>
                <input required type="number" placeholder="Anos" className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl outline-none font-black text-slate-800 focus:ring-2 focus:ring-blue-500" value={formData.age === undefined ? '' : formData.age} onChange={e => setFormData({ ...formData, age: e.target.value === '' ? undefined : parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prontuário</label>
                <input required type="text" inputMode="numeric" className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-mono font-black text-slate-800 text-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.medicalRecord} onChange={e => setFormData({ ...formData, medicalRecord: e.target.value.replace(/\D/g, '') })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidade</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value as Specialty })}>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corredor / Localização</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.corridor} onChange={e => setFormData({ ...formData, corridor: e.target.value as Corridor })}>
                  {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${!formData.hasBracelet ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-blue-900'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${!formData.hasBracelet ? 'text-red-700' : 'text-slate-500'}`}>Pulseira de Identificação?</span>
                  </div>
                  <input type="checkbox" className="w-6 h-6 rounded accent-blue-600 cursor-pointer" checked={formData.hasBracelet} onChange={e => setFormData({...formData, hasBracelet: e.target.checked})} />
               </div>

               <div className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${!formData.hasBedIdentification ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-blue-900'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${!formData.hasBedIdentification ? 'text-red-700' : 'text-slate-500'}`}>Identificação de Leito?</span>
                  </div>
                  <input type="checkbox" className="w-6 h-6 rounded accent-blue-600 cursor-pointer" checked={formData.hasBedIdentification} onChange={e => setFormData({...formData, hasBedIdentification: e.target.checked})} />
               </div>

               <div className="p-4 bg-slate-50 border border-blue-900 rounded-3xl flex flex-col justify-center">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Situação</label>
                  <div className="flex bg-white rounded-xl p-1 gap-1">
                    {['Maca', 'Cadeira'].map(s => (
                      <button key={s} type="button" onClick={() => setFormData({...formData, situation: s as any})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${formData.situation === s ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{s}</button>
                    ))}
                  </div>
               </div>
            </div>
          </section>

          {/* II. DADOS CLÍNICOS E STATUS */}
          <section className="space-y-8">
            <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">II. Dados Clínicos e Status</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as PatientStatus })}>
                  {PATIENT_STATUSES.filter(s => !['Reavaliação', 'Transferência UPA', 'Transferência Externa'].includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Possui AIH?</label>
                 <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.hasAIH ? 'Sim' : 'Não'} onChange={e => setFormData({ ...formData, hasAIH: e.target.value === 'Sim' })}>
                    <option value="Sim">SIM</option>
                    <option value="Não">NÃO</option>
                 </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pendências Atuais</label>
              <select className="w-full px-5 py-4 bg-white border border-blue-900 rounded-2xl font-black text-amber-600 outline-none focus:ring-2 focus:ring-blue-500" value={formData.pendencies} onChange={e => handlePendencyChange(e.target.value as PendencyType)}>
                {PENDENCIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnóstico Principal</label>
              <input required type="text" className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl outline-none uppercase font-black text-slate-800 focus:ring-2 focus:ring-blue-500" value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value.toUpperCase() })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobilidade</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-blue-900 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.mobility} onChange={e => setFormData({ ...formData, mobility: e.target.value as any })}>
                  <option value="Deambula">DEAMBULA</option>
                  <option value="Deambula com auxilio">DEAMBULA COM AUXÍLIO</option>
                  <option value="Acamado">ACAMADO</option>
                  <option value="Restrito ao leito">RESTRITO AO LEITO</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acesso Venoso (Tipo/Data)</label>
                <div className="space-y-2">
                  <input 
                    placeholder="EX: MSD 22/01" 
                    className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none uppercase font-black focus:ring-2 focus:ring-blue-500 ${venousExpired ? 'border-red-500 text-red-600 animate-pulse' : 'border-blue-900 text-slate-700'}`} 
                    value={formData.venousAccess} 
                    onChange={e => setFormData({ ...formData, venousAccess: e.target.value.toUpperCase() })} 
                  />
                  {venousExpired && (
                    <div className="bg-red-600 text-white p-3 rounded-xl flex items-center gap-2 animate-bounce shadow-lg">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p className="text-[10px] font-black uppercase tracking-tight">⚠️ ALERTA: ACESSO VENCIDO (&gt;96H). FAVOR REALIZAR A TROCA!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ALERGIA E LESÃO LADO A LADO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD LILÁS: ALERGIA */}
              <div className="space-y-4 p-6 bg-purple-100 border-2 border-purple-200 rounded-[2.5rem] shadow-sm">
                <label className="text-[10px] font-black text-purple-700 uppercase flex items-center gap-2 tracking-[0.2em]">
                  <ShieldAlert className="w-4 h-4" /> Alergia?
                </label>
                <div className="space-y-3">
                   <select className="w-full px-5 py-3 bg-white border border-blue-900 rounded-xl font-black text-purple-900 outline-none focus:ring-2 focus:ring-blue-500" value={formData.hasAllergy ? 'Sim' : 'Não'} onChange={e => setFormData({ ...formData, hasAllergy: e.target.value === 'Sim' })}>
                     <option value="Não">NÃO</option>
                     <option value="Sim">SIM</option>
                   </select>
                   {formData.hasAllergy && (
                     <input required placeholder="QUAL ALERGIA?" className="w-full px-5 py-3 bg-white border border-blue-900 rounded-xl outline-none uppercase font-black text-purple-900 focus:ring-2 focus:ring-blue-500" value={formData.allergyDetails} onChange={e => setFormData({ ...formData, allergyDetails: e.target.value.toUpperCase() })} />
                   )}
                </div>
              </div>

              {/* CARD AMARELO: LESÃO CUTÂNEA */}
              <div className="space-y-4 p-6 bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] shadow-sm">
                <label className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-2 tracking-[0.2em]">
                  <Activity className="w-4 h-4" /> Lesão Cutânea?
                </label>
                <div className="space-y-3">
                   <select className="w-full px-5 py-3 bg-white border border-blue-900 rounded-xl font-black text-amber-900 outline-none focus:ring-2 focus:ring-blue-500" value={formData.hasLesion ? 'Sim' : 'Não'} onChange={e => setFormData({ ...formData, hasLesion: e.target.value === 'Sim' })}>
                     <option value="Não">NÃO</option>
                     <option value="Sim">SIM</option>
                   </select>
                   {formData.hasLesion && (
                     <input required placeholder="QUAL LESÃO/ESTÁGIO?" className="w-full px-5 py-3 bg-white border border-blue-900 rounded-xl outline-none uppercase font-black text-amber-900 focus:ring-2 focus:ring-blue-500" value={formData.lesionDescription} onChange={e => setFormData({ ...formData, lesionDescription: e.target.value.toUpperCase() })} />
                   )}
                </div>
              </div>
            </div>

            {/* CARD VERDE: DEFICIÊNCIA */}
            <div className="space-y-6 p-8 bg-emerald-50 border-2 border-emerald-200 rounded-[2.5rem] shadow-sm">
              <label className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-2 tracking-[0.2em]">
                <Accessibility className="w-5 h-5" /> Deficiência?
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {DISABILITY_OPTIONS.map((opt) => {
                  const isSelected = formData.disabilities?.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleDisability(opt.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all active:scale-90 relative ${
                        isSelected 
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-xl' 
                        : 'bg-white border-emerald-100 text-emerald-400 hover:border-emerald-300'
                      }`}
                    >
                      <opt.icon className={`w-7 h-7 mb-2 ${isSelected ? 'text-white' : 'text-emerald-500/50'}`} />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-center">{opt.label}</span>
                      {isSelected && <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* IV. PRESCRIÇÃO E DIETA */}
          <section className="space-y-8">
            <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">IV. Prescrição e Dieta</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prescrição Médica Ativa?</label>
                  <select className={`w-full px-5 py-4 border-2 rounded-2xl font-black transition-all outline-none focus:ring-2 focus:ring-blue-500 ${formData.hasPrescription ? 'bg-blue-50 border-blue-900 text-blue-700' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`} value={formData.hasPrescription ? 'Sim' : 'Não'} onChange={e => setFormData({ ...formData, hasPrescription: e.target.value === 'Sim' })}>
                    <option value="Sim">SIM</option>
                    <option value="Não">NÃO</option>
                  </select>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Utensils className="w-4 h-4" /> Dieta
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DIETS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDiet(d)}
                        className={`px-3 py-2.5 rounded-xl text-[9px] font-black border-2 transition-all uppercase ${formData.diet?.includes(d) ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-slate-50 border-blue-900 text-slate-400 hover:bg-slate-100'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Informações Importantes / Observações</label>
              <textarea rows={4} className="w-full px-6 py-5 bg-slate-50 border border-blue-900 rounded-[2rem] outline-none uppercase font-black text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value.toUpperCase() })} />
            </div>
          </section>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'MAIN_MENU' }))} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95">Voltar</button>
            <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest hover:bg-blue-700 transition-all active:scale-95">
              <Save className="w-6 h-6" /> Salvar Cadastro
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
