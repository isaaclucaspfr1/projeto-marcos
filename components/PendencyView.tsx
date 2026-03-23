
import React, { useMemo, useState } from 'react';
import { Patient, Role, DietType, PendencyType } from '../types';
import { 
  ShieldCheck, 
  FileSearch, 
  Stethoscope, 
  UserCog, 
  AlertTriangle, 
  CheckCircle2, 
  HeartHandshake,
  AlertCircle,
  X,
  Check,
  Utensils,
  LogOut,
  UserCheck,
  Clock
} from 'lucide-react';
import { DIETS } from '../constants';

interface PendencyViewProps {
  patients: Patient[];
  onUpdatePatient: (id: string, updates: Partial<Patient>) => void;
  role: Role;
}

const PendencyView: React.FC<PendencyViewProps> = ({ patients, onUpdatePatient, role }) => {
  const [solvingDietId, setSolvingDietId] = useState<string | null>(null);
  const [solvingReevaluationId, setSolvingReevaluationId] = useState<string | null>(null);
  const [solvingTransferId, setSolvingTransferId] = useState<string | null>(null);
  const [transferDestination, setTransferDestination] = useState('');
  const [selectedDiets, setSelectedDiets] = useState<DietType[]>([]);

  const active = patients.filter(p => !p.isTransferred);

  const categories = useMemo(() => ({
    safety: active.filter(p => !p.hasBracelet || !p.hasBedIdentification),
    exams: active.filter(p => [
      'Aguardando exames laboratoriais', 
      'Aguardando Tomografia', 
      'Aguardando Raio-X', 
      'Aguardando Ultrassom',
      'Exames realizados, aguardando resultado'
    ].includes(p.pendencies)),
    prescription: active.filter(p => p.pendencies === 'Sem prescrição médica' || p.pendencies === 'Sem dieta'),
    // ADMIN agora inclui também todos que estão com status de ALTA
    admin: active.filter(p => p.pendencies === 'Aguardando Assistente Social' || p.status === 'Alta' || p.pendencies === 'Transferência UPA' || p.pendencies === 'Transferência Externo'),
    reevaluations: active.filter(p => p.status === 'Reavaliação' || p.pendencies === 'Reavaliação médica')
  }), [active]);

  const handleResolveDiet = (id: string) => {
    onUpdatePatient(id, { 
      pendencies: 'Nenhuma', 
      diet: selectedDiets.length > 0 ? selectedDiets : ['Livre'] 
    });
    setSolvingDietId(null);
    setSelectedDiets([]);
  };

  const toggleDietSelection = (diet: DietType) => {
    setSelectedDiets(prev => 
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleFinalizeAlta = (p: Patient) => {
    onUpdatePatient(p.id, { 
      status: 'Alta',
      isTransferred: true, 
      transferredAt: new Date().toISOString() 
    });
    alert(`Paciente ${p.name} finalizado com sucesso! Alta confirmada.`);
    // Opcional: Redirecionar para finalizados
  };

  const Card = ({ title, icon: Icon, color, items, safety }: { title: string, icon: any, color: string, items: Patient[], safety?: boolean }) => (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className={`p-5 ${color} text-white flex items-center justify-between`}>
         <div className="flex items-center gap-3">
            <Icon className="w-6 h-6" />
            <h4 className="font-black text-sm uppercase tracking-widest">{title}</h4>
         </div>
         <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold">{items.length}</span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[500px]">
        {items.map(p => {
          const isAlta = p.status === 'Alta';
          const needsSocial = p.pendencies === 'Aguardando Assistente Social';

          return (
          <div key={p.id} className={`p-4 border rounded-2xl space-y-3 relative group transition-all ${isAlta ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
             <div>
                <h5 className="font-black text-slate-800 text-xs line-clamp-1 uppercase">{p.name}</h5>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.corridor}</p>
             </div>
             
             <div className="flex flex-col gap-1">
                {safety ? (
                  <>
                    {!p.hasBracelet && <span className="text-[8px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase inline-flex items-center gap-1">
                       <AlertCircle className="w-2.5 h-2.5" /> Sem Pulseira
                    </span>}
                    {!p.hasBedIdentification && <span className="text-[8px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black uppercase inline-flex items-center gap-1">
                       <AlertCircle className="w-2.5 h-2.5" /> Sem ID Leito
                    </span>}
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    {isAlta && (
                       <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase inline-flex items-center gap-1 w-fit">
                          <LogOut className="w-2.5 h-2.5" /> Status: Alta
                       </span>
                    )}
                    <span className={`text-[9px] font-black uppercase italic leading-tight ${isAlta && needsSocial ? 'text-red-600 animate-pulse' : (p.pendencies === 'Sem dieta' || p.pendencies === 'Sem prescrição médica' ? 'text-indigo-600' : 'text-blue-600')}`}>
                      {title === 'Reavaliações' 
                        ? p.specialty.toUpperCase() 
                        : (isAlta && needsSocial ? 'DE ALTA AGUARDANDO ASSISTENTE SOCIAL' : (isAlta && !needsSocial ? 'AGUARDANDO FINALIZAÇÃO DE ALTA' : p.pendencies.toUpperCase()))}
                    </span>
                  </div>
                )}
             </div>

             {solvingTransferId === p.id ? (
               <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-4 animate-in zoom-in duration-200">
                 <div className="flex items-center gap-2 mb-2">
                    <LogOut className="w-4 h-4 text-blue-600" />
                    <p className="text-[10px] font-black text-blue-900 uppercase">Paciente foi transferido para onde?</p>
                 </div>
                 <input 
                   type="text" 
                   placeholder="Ex.: UPA HOB - Cersan" 
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                   value={transferDestination}
                   onChange={e => setTransferDestination(e.target.value)}
                 />
                 <div className="flex gap-2">
                   <button onClick={() => { setSolvingTransferId(null); setTransferDestination(''); }} className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase">Cancelar</button>
                   <button 
                     onClick={() => {
                       if (!transferDestination) return alert("Informe o destino da transferência");
                       onUpdatePatient(p.id, { 
                         isTransferred: true, 
                         transferredAt: new Date().toISOString(),
                         transferDestinationBed: transferDestination.toUpperCase(),
                         status: 'Transferência Externa'
                       });
                       setSolvingTransferId(null);
                       setTransferDestination('');
                       alert(`Paciente ${p.name} transferido com sucesso!`);
                     }} 
                     className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg"
                   >
                     Concluir
                   </button>
                 </div>
               </div>
             ) : solvingReevaluationId === p.id ? (
               <div className="bg-white p-4 rounded-xl border border-amber-100 space-y-4 animate-in zoom-in duration-200">
                 <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-[10px] font-black text-amber-900 uppercase">Qual foi a conduta médica?</p>
                 </div>
                 <div className="flex flex-col gap-2">
                   <button
                     onClick={() => {
                       onUpdatePatient(p.id, { status: 'Internado', pendencies: 'Nenhuma' });
                       setSolvingReevaluationId(null);
                     }}
                     className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md"
                   >
                     Internado
                   </button>
                   <button
                     onClick={() => {
                       onUpdatePatient(p.id, { status: 'Observação', pendencies: 'Nenhuma' });
                       setSolvingReevaluationId(null);
                     }}
                     className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md"
                   >
                     Observação
                   </button>
                   <button
                     onClick={() => {
                       handleFinalizeAlta(p);
                       setSolvingReevaluationId(null);
                     }}
                     className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md"
                   >
                     Alta
                   </button>
                   <button onClick={() => setSolvingReevaluationId(null)} className="w-full py-2 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase">Cancelar</button>
                 </div>
               </div>
             ) : solvingDietId === p.id ? (
               <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-4 animate-in zoom-in duration-200">
                 <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-indigo-600" />
                    <p className="text-[10px] font-black text-indigo-900 uppercase">Selecione a(s) Dieta(s):</p>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   {DIETS.filter(d => d !== 'Sem prescrição').map(diet => (
                     <button
                       key={diet}
                       type="button"
                       onClick={() => toggleDietSelection(diet)}
                       className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase border-2 transition-all ${selectedDiets.includes(diet) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                     >
                       {diet}
                     </button>
                   ))}
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button onClick={() => setSolvingDietId(null)} className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase">Voltar</button>
                    <button onClick={() => handleResolveDiet(p.id)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg">Finalizar</button>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col gap-2">
                  {/* Botões específicos para o módulo ADMIN de Alta/Social */}
                  {title === 'Admin/Transf' && isAlta && needsSocial && (
                    <button onClick={() => onUpdatePatient(p.id, { pendencies: 'Nenhuma' })} className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-200 transition-all border border-indigo-200">
                      <HeartHandshake className="w-3.5 h-3.5" />
                      Concluir Ass. Social
                    </button>
                  )}
                  
                  <button onClick={() => {
                    if (safety) {
                      onUpdatePatient(p.id, { hasBracelet: true, hasBedIdentification: true });
                    } else if (p.status === 'Alta') {
                      handleFinalizeAlta(p);
                    } else if (p.pendencies === 'Transferência UPA') {
                      onUpdatePatient(p.id, { 
                        isTransferred: true, 
                        transferredAt: new Date().toISOString(),
                        transferDestinationBed: 'RETORNOU PARA UPA',
                        status: 'Transferência UPA'
                      });
                      alert(`Paciente ${p.name} encaminhado para UPA com sucesso!`);
                    } else if (p.pendencies === 'Transferência Externo') {
                      setSolvingTransferId(p.id);
                    } else if (p.pendencies === 'Reavaliação médica' || p.status === 'Reavaliação') {
                      setSolvingReevaluationId(p.id);
                    } else if (p.pendencies === 'Sem dieta') {
                      setSolvingDietId(p.id);
                    } else if (p.pendencies === 'Sem prescrição médica') {
                      onUpdatePatient(p.id, { pendencies: 'Nenhuma', hasPrescription: true });
                    } else {
                      onUpdatePatient(p.id, { pendencies: 'Nenhuma' });
                    }
                  }} className={`w-full py-2 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${isAlta ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                      {isAlta ? <LogOut className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isAlta ? 'Finalizar Alta' : (safety ? 'Identificado' : (p.pendencies === 'Transferência UPA' || p.pendencies === 'Transferência Externo' || p.pendencies === 'Reavaliação médica' || p.status === 'Reavaliação' ? 'Concluído' : 'Concluído'))}
                  </button>
               </div>
             )}
          </div>
        )})}
        {items.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-300 opacity-40">
             <ShieldCheck className="w-10 h-10 mb-2" />
             <span className="text-[10px] font-black uppercase">Tudo em dia</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      <Card title="Segurança" icon={ShieldCheck} color="bg-red-600" items={categories.safety} safety />
      <Card title="Exames" icon={FileSearch} color="bg-blue-600" items={categories.exams} />
      <Card title="Prescrição" icon={Stethoscope} color="bg-indigo-600" items={categories.prescription} />
      <Card title="Admin/Transf" icon={UserCog} color="bg-slate-700" items={categories.admin} />
      <Card title="Reavaliações" icon={Clock} color="bg-amber-500" items={categories.reevaluations} />
    </div>
  );
};

export default PendencyView;
