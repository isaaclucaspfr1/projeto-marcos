
import React, { useState } from 'react';
import { Patient, Specialty, PendencyType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  BrainCircuit, 
  Loader2, 
  Sparkles, 
  ChevronRight, 
  ArrowRightLeft, 
  User, 
  AlertCircle, 
  X,
  ShieldAlert,
  Activity,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Accessibility,
  Users,
  Clock,
  ExternalLink,
  HeartPulse,
  Syringe,
  FileText,
  CalendarDays,
  Ban,
  Stethoscope
} from 'lucide-react';

interface ClinicalDecisionProps {
  patients: Patient[];
  onUpdatePatient: (id: string, updates: Partial<Patient>) => void;
}

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

const ClinicalDecision: React.FC<ClinicalDecisionProps> = ({ patients, onUpdatePatient }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<'all' | 'chairs' | null>(null);
  const [prioritizedList, setPrioritizedList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Estados para formulário de transferência (Fluxo Enfermaria)
  const [transferForm, setTransferForm] = useState(false);
  const [sector, setSector] = useState('');
  const [bed, setBed] = useState('');

  const getEligible = (filterType: 'all' | 'chairs') => {
    if (filterType === 'all') {
      // Regra: Internados/Obs/Reaval, sem pedido ativo de transferência, sem status de saída
      return patients.filter(p => 
        !p.isTransferred && 
        !p.isTransferRequested && 
        !['Alta', 'Transferência UPA', 'Transferência Externa'].includes(p.status)
      );
    } else {
      // Regra: Em cadeiras, não pode ser Alta. Pode ser Transf UPA/Ext (priorizar conforto na maca)
      return patients.filter(p => 
        !p.isTransferred && 
        p.situation === 'Cadeira' && 
        p.status !== 'Alta'
      );
    }
  };

  const performAnalysis = async (filterType: 'all' | 'chairs') => {
    const eligible = getEligible(filterType);
    
    if (eligible.length === 0) {
        alert(filterType === 'chairs' ? "Não há pacientes em cadeiras para análise no momento." : "Não há pacientes elegíveis para análise clínica de vaga.");
        setShowFilterModal(false);
        return;
    }

    setAnalyzing(true);
    setShowFilterModal(false);
    setCurrentFilterType(filterType);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const objective = filterType === 'all' 
        ? "PRIORIZAR VAGA EM ENFERMARIA (Sair do corredor para leito fixo)." 
        : "PRIORIZAR CONFORTO EM MACA (Sair da cadeira para maca).";

      const prompt = `Aja como um Preceptor de Enfermagem altamente experiente, utilizando raciocínio clínico avançado e empatia.
      OBJETIVO: ${objective}
      
      CRITÉRIOS DE ANÁLISE (PENSAMENTO CRÍTICO):
      1. IDADE: Extremos de idade (idosos) têm peso elevado.
      2. DIAGNÓSTICO: Gravidade clínica e instabilidade potencial.
      3. MOBILIDADE: Acamados e restritos têm prioridade absoluta sobre quem deambula.
      4. LESÕES: Presença de lesão cutânea exige superfície adequada (maca/leito) para evitar progressão.
      5. DEFICIÊNCIA: Necessidades especiais de posicionamento e cuidado.
      6. SEXO E ACOMODAÇÃO: Respeito à dignidade e privacidade.
      7. RISCO DE QUEDA: Pacientes confusos ou com mobilidade prejudicada em cadeiras são risco iminente.

      Analise minuciosamente os dados e forneça um escore de prioridade (0-100) e um parecer técnico humanizado explicando O PORQUÊ daquela posição na lista.
      
      DADOS DOS PACIENTES: ${JSON.stringify(eligible.map(p => ({ 
        id: p.id, 
        nome: p.name, 
        idade: p.age, 
        sexo: p.sex,
        diag: p.diagnosis, 
        mob: p.mobility, 
        lesao: p.hasLesion ? p.lesionDescription : 'Não possui',
        deficiencias: p.disabilities || [],
        acomodacao: p.situation,
        status: p.status,
        obs: p.notes 
      })))}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                priorityScore: { type: Type.NUMBER },
                clinicalInsight: { type: Type.STRING }
              },
              required: ["id", "priorityScore", "clinicalInsight"]
            }
          }
        }
      });

      const analysis = JSON.parse(response.text || '[]');
      const enriched = analysis.map((a: any) => {
        const p = eligible.find(p => p.id === a.id);
        return { ...p, ...a };
      }).sort((a: any, b: any) => b.priorityScore - a.priorityScore);

      setPrioritizedList(enriched);
    } catch (e) {
      console.error(e);
      alert("Erro na análise clínica. Verifique sua conexão ou tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyTransfer = () => {
    if (!selectedPatient) return;

    if (currentFilterType === 'all') {
      if (!sector || !bed) {
        alert("Informe o setor e o leito de destino.");
        return;
      }
      onUpdatePatient(selectedPatient.id, {
        isTransferRequested: true,
        transferDestinationSector: sector.toUpperCase(),
        transferDestinationBed: bed,
        status: 'Internado'
      });
      alert(`Transferência para enfermaria solicitada: ${selectedPatient.name}`);
    } else {
      // Fluxo de Cadeira para Maca
      onUpdatePatient(selectedPatient.id, { situation: 'Maca' });
      alert(`${selectedPatient.name} movido(a) para Maca com sucesso.`);
    }

    // Reset geral após ação
    setSelectedPatient(null);
    setTransferForm(false);
    setSector('');
    setBed('');
    // Remove o paciente da lista atual processada para refletir a mudança
    setPrioritizedList(prev => prev.filter(p => p.id !== selectedPatient.id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER E AÇÃO PRINCIPAL */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-8 rounded-[2.5rem] shadow-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
           <BrainCircuit className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-6 relative z-10">
           <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/20 shadow-2xl">
              <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
           </div>
           <div>
              <h2 className="text-3xl font-black tracking-tighter">Preceptor Virtual IA</h2>
              <p className="text-blue-200/70 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                 Decisão Clínica & Gestão de Fluxo
              </p>
           </div>
        </div>
        <button 
          onClick={() => setShowFilterModal(true)} 
          disabled={analyzing} 
          className="bg-white text-blue-900 px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-50 active:scale-95 flex items-center gap-3 shadow-2xl disabled:opacity-50 relative z-10"
        >
           {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
           Processar Prioridades
        </button>
      </div>

      {/* MODAL DE SELEÇÃO DE FLUXO */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-10 text-white text-center">
               <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-xl">
                  <BrainCircuit className="w-12 h-12" />
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tight">Análise Estratégica</h3>
               <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">Selecione o objetivo da priorização</p>
            </div>
            <div className="p-10 space-y-4">
               <button 
                 onClick={() => performAnalysis('all')}
                 className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center gap-6 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
               >
                  <div className="p-4 bg-white rounded-3xl shadow-md text-blue-600 group-hover:scale-110 transition-transform">
                     <Users className="w-8 h-8" />
                  </div>
                  <div>
                     <p className="font-black text-slate-800 text-base uppercase tracking-tight">Vagas em Enfermaria</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Priorizar pacientes do corredor para leitos fixos.</p>
                  </div>
               </button>

               <button 
                 onClick={() => performAnalysis('chairs')}
                 className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center gap-6 hover:border-amber-500 hover:bg-amber-50 transition-all group text-left"
               >
                  <div className="p-4 bg-white rounded-3xl shadow-md text-amber-600 group-hover:scale-110 transition-transform">
                     <Activity className="w-8 h-8" />
                  </div>
                  <div>
                     <p className="font-black text-slate-800 text-base uppercase tracking-tight">Mover para Maca</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Priorizar pacientes em cadeiras para conforto em macas.</p>
                  </div>
               </button>

               <button 
                 onClick={() => setShowFilterModal(false)}
                 className="w-full py-6 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-slate-600"
               >
                  Cancelar Operação
               </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTAGEM DE RESULTADOS IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prioritizedList.map((p, idx) => (
          <div 
            key={p.id} 
            className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative 
              ${p.hasAllergy ? 'border-purple-300 bg-purple-50/10' : 'border-slate-100'} 
              ${p.status.includes('Transferência') ? 'ring-1 ring-orange-200' : ''}`} 
            onClick={() => setSelectedPatient(p)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black 
                  ${p.priorityScore > 80 ? 'bg-red-600 text-white' : (p.priorityScore > 50 ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white')}`}>
                   <span className="text-[8px] leading-none mb-1 opacity-80">RANK</span>
                   <span className="text-lg leading-none">{idx + 1}</span>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 group-hover:text-blue-600 truncate uppercase max-w-[150px]">{p.name}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prontuário: {p.medicalRecord}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex gap-1">
                   {p.hasAllergy && <ShieldAlert className="w-4 h-4 text-purple-600" />}
                   {p.hasLesion && <Activity className="w-4 h-4 text-amber-600" />}
                   {p.isTransferRequested && <HeartPulse className="w-4 h-4 text-orange-500 animate-pulse" />}
                </div>
                <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{p.situation}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500 border-t border-slate-50 pt-3">
              <span className="truncate max-w-[60%]">{p.specialty}</span>
              <span className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                 Análise IA <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}

        {prioritizedList.length === 0 && !analyzing && (
           <div className="col-span-full py-32 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <BrainCircuit className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-black uppercase tracking-[0.3em] text-xs">Selecione um fluxo para iniciar a priorização inteligente</p>
           </div>
        )}
      </div>

      {/* MODAL DE DETALHES COMPLETO (REPLICADO DO PATIENTLIST) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
            {/* CABEÇALHO DO MODAL */}
            <div className={`p-8 text-white flex justify-between items-start shrink-0 rounded-t-[3rem] 
              ${selectedPatient.hasAllergy ? 'bg-purple-600' : (selectedPatient.priorityScore > 80 ? 'bg-red-700' : 'bg-blue-700')}`}>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
                  <User className="w-12 h-12" />
                </div>
                <div>
                   <h3 className="text-3xl font-black tracking-tighter uppercase leading-tight">{selectedPatient.name}</h3>
                   <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Prontuário: {selectedPatient.medicalRecord}
                     </span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5" /> {selectedPatient.age} anos
                     </span>
                     <span className="text-white/80 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> {selectedPatient.status.toUpperCase()}
                     </span>
                   </div>
                </div>
              </div>
              <button onClick={() => { setSelectedPatient(null); setTransferForm(false); }} className="p-3 hover:bg-white/20 rounded-full transition-all active:scale-90">
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* CORPO DO MODAL - SCROLLABLE */}
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
               
               {/* PARECER DA IA (DESTAQUE) */}
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                     <Sparkles className="w-20 h-20 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                     <Sparkles className="w-5 h-5 text-blue-600 fill-blue-600" />
                     <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Parecer Clínico Humanizado</h4>
                  </div>
                  <p className="text-blue-900 font-bold text-lg leading-relaxed italic relative z-10">
                     "{selectedPatient.clinicalInsight}"
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                     <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div className={`h-full transition-all duration-1000 ${selectedPatient.priorityScore > 80 ? 'bg-red-600' : 'bg-blue-600'}`} style={{ width: `${selectedPatient.priorityScore}%` }}></div>
                     </div>
                     <span className="text-[11px] font-black text-slate-900 uppercase">{selectedPatient.priorityScore}% Prioridade</span>
                  </div>
               </div>

               {/* GRID DE INFORMAÇÕES GERAIS */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                        <Stethoscope className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Diagnóstico & Mobilidade</h4>
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                           <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Diagnóstico Principal</p>
                           <p className="font-black text-slate-800 uppercase leading-tight">{selectedPatient.diagnosis || 'NÃO INFORMADO'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Especialidade</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{selectedPatient.specialty}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mobilidade</p>
                              <p className="font-bold text-slate-800 text-xs uppercase">{selectedPatient.mobility}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-l-4 border-emerald-600 pl-3">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Localização & Segurança</h4>
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-2xl text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Acomodação</p>
                              <p className="font-black text-blue-700 uppercase">{selectedPatient.situation}</p>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Corredor</p>
                              <p className="font-black text-slate-700 uppercase">{selectedPatient.corridor}</p>
                           </div>
                        </div>
                        <div className="flex justify-around gap-4">
                           <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${selectedPatient.hasBracelet ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                              {selectedPatient.hasBracelet ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} Pulseira ID
                           </div>
                           <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${selectedPatient.hasBedIdentification ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                              {selectedPatient.hasBedIdentification ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} ID Leito
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* ALERTAS CRÍTICOS */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-[2rem] border transition-all ${selectedPatient.hasAllergy ? 'bg-purple-50 border-purple-200 shadow-md' : 'bg-white border-slate-100 opacity-60'}`}>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Alergias</p>
                     <div className="flex items-center gap-3">
                        <ShieldAlert className={`w-8 h-8 ${selectedPatient.hasAllergy ? 'text-purple-600' : 'text-slate-200'}`} />
                        <p className="font-black text-xs uppercase leading-tight text-slate-800">
                           {selectedPatient.hasAllergy ? selectedPatient.allergyDetails : 'Nenhuma Alergia Notificada'}
                        </p>
                     </div>
                  </div>

                  <div className={`p-6 rounded-[2rem] border transition-all ${selectedPatient.hasLesion ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-white border-slate-100 opacity-60'}`}>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Lesão Cutânea</p>
                     <div className="flex items-center gap-3">
                        <Activity className={`w-8 h-8 ${selectedPatient.hasLesion ? 'text-amber-500' : 'text-slate-200'}`} />
                        <p className="font-black text-xs uppercase leading-tight text-slate-800">
                           {selectedPatient.hasLesion ? selectedPatient.lesionDescription : 'Integridade Cutânea Mantida'}
                        </p>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-800 rounded-[2rem] text-white">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Acesso Venoso</p>
                     <div className="flex items-center gap-3">
                        <Syringe className="w-8 h-8 text-blue-400" />
                        <div>
                           <p className="font-black text-xs uppercase">{selectedPatient.venousAccess || 'NENHUM'}</p>
                           {isVenousAccessExpired(selectedPatient.venousAccess || '') && (
                              <p className="text-[8px] font-black text-red-400 uppercase mt-1 animate-pulse">TROCA NECESSÁRIA</p>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {/* OBSERVAÇÕES */}
               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Notas do Plantão</h4>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 font-bold text-slate-700 text-sm uppercase leading-relaxed italic">
                     {selectedPatient.notes || 'Sem observações adicionais registradas.'}
                  </div>
               </div>
            </div>

            {/* BARRA DE AÇÕES (DIFERENCIADA POR FLUXO) */}
            <div className="p-8 bg-white border-t border-slate-100 shrink-0">
               {!transferForm ? (
                  <button 
                    onClick={() => {
                      if (currentFilterType === 'all') setTransferForm(true);
                      else handleApplyTransfer(); // No fluxo de cadeira, executa direto ou após confirmação simples
                    }}
                    className={`w-full py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95
                      ${currentFilterType === 'all' ? 'bg-slate-900 text-white' : 'bg-amber-500 text-white'}`}
                  >
                    {currentFilterType === 'all' ? <ArrowRightLeft className="w-6 h-6" /> : <Accessibility className="w-6 h-6" />}
                    {currentFilterType === 'all' ? 'Solicitar Transferência para Enfermaria' : 'Mudar para Acomodação em Maca'}
                  </button>
               ) : (
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-indigo-100 space-y-6 animate-in slide-in-from-bottom-4">
                     <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-indigo-600" />
                        <h4 className="font-black text-slate-800 uppercase tracking-tight">Definir Destino Assistencial</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor de Destino</label>
                           <input 
                             placeholder="EX: CLÍNICA MÉDICA" 
                             className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-slate-800 uppercase" 
                             value={sector} 
                             onChange={e => setSector(e.target.value.toUpperCase())} 
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Leito</label>
                           <input 
                             placeholder="Nº" 
                             className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-center font-black text-lg" 
                             value={bed} 
                             onChange={e => setBed(e.target.value)} 
                           />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <button onClick={() => setTransferForm(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button onClick={handleApplyTransfer} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest">
                           <CheckCircle2 className="w-5 h-5" /> Confirmar Transferência
                        </button>
                     </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalDecision;
