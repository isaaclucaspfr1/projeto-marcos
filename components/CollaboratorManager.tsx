
import React, { useState, useMemo } from 'react';
import { Collaborator, Role, User as AuthUser } from '../types';
import { 
  UserPlus, 
  RotateCcw, 
  UserMinus, 
  Search, 
  X, 
  ShieldCheck, 
  Stethoscope, 
  Briefcase, 
  UserSearch, 
  AlertCircle, 
  CheckCircle2,
  Users,
  ChevronRight,
  ArrowLeft,
  Lock
} from 'lucide-react';

interface CollaboratorManagerProps {
  user: AuthUser;
  collaborators: Collaborator[];
  onUpdate: (c: Collaborator[]) => void;
  onCancel: () => void;
}

const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({ user, collaborators, onUpdate, onCancel }) => {
  const [view, setView] = useState<'LIST' | 'NEW' | 'USERS_LIST' | 'USER_DETAIL'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  
  // Form New (Developer only)
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState<Role>('tecnico');

  const isDev = user.username === '5669';
  const isCoord = user.role === 'coordenacao';
  const isNurse = user.role === 'enfermeiro';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!/^\d+$/.test(login)) return alert("O usuário (login) deve ser numérico.");
    
    if (collaborators.some(c => c.login === login && !c.isDeleted)) {
      alert("Este usuário já está cadastrado.");
      return;
    }

    const newCollab: Collaborator = { 
      id: crypto.randomUUID(), 
      name, 
      login, 
      password: '1234', 
      role, 
      failedAttempts: 0, 
      isBlocked: false, 
      isDeleted: false 
    };
    onUpdate([...collaborators, newCollab]);
    setView('LIST');
    setName(''); setLogin('');
    alert("Colaborador cadastrado com sucesso! Senha padrão: 1234");
  };

  const getStatusDisplay = (collab: Collaborator) => {
    if (collab.isDeleted) return { text: 'Excluído', color: 'text-red-600', bg: 'bg-red-50', icon: UserMinus };
    if (collab.isBlocked) return { text: 'Bloqueado', color: 'text-orange-600', bg: 'bg-orange-50', icon: Lock };
    return { text: 'Ativo', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 };
  };

  const filteredCollaborators = useMemo(() => {
    return collaborators
      .filter(c => !c.isDeleted || isDev)
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.login.includes(searchTerm)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collaborators, searchTerm, isDev]);

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex justify-between items-center mb-10 no-print">
         <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
              {isNurse ? 'Consulta de Usuários' : 'Gestão de Equipes'}
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              {isDev ? 'Acesso Master Developer' : (isCoord ? 'Módulo de Coordenação' : 'Módulo de Enfermagem')}
            </p>
         </div>
         <button onClick={onCancel} className="p-3 bg-slate-100 rounded-2xl transition-transform active:scale-90"><X /></button>
      </div>

      {view === 'LIST' && (
        <div className="animate-in zoom-in duration-300">
           <div className={`grid grid-cols-1 gap-4 ${(isDev || isCoord) ? 'sm:grid-cols-2' : ''}`}>
               {(isDev || isCoord) && (
                 <button onClick={() => setView('NEW')} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col items-center group">
                    <div className="p-4 bg-blue-600 text-white rounded-3xl mb-4 group-hover:scale-110 transition-transform">
                       <UserPlus className="w-10 h-10" />
                    </div>
                    <span className="font-black text-slate-700 uppercase tracking-[0.2em] text-xs">Novo Cadastro</span>
                 </button>
               )}
               
               <button onClick={() => setView('USERS_LIST')} className={`bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col items-center group ${!(isDev || isCoord) ? 'max-w-md mx-auto w-full' : ''}`}>
                  <div className={`p-4 rounded-3xl ${isNurse ? 'bg-emerald-600' : 'bg-indigo-600'} text-white mb-4 group-hover:scale-110 transition-transform`}>
                     {isNurse ? <UserSearch className="w-10 h-10" /> : <Users className="w-10 h-10" />}
                  </div>
                  <span className="font-black text-slate-700 uppercase tracking-[0.2em] text-xs">
                    {isNurse ? 'Consultar Usuários' : 'Usuários'}
                  </span>
               </button>
           </div>
        </div>
      )}

      {view === 'NEW' && (isDev || isCoord) && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-4">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserPlus className="w-6 h-6" /></div>
                <h3 className="text-xl font-black text-slate-800">Novo Cadastro</h3>
              </div>
              <button type="button" onClick={() => setView('LIST')} className="p-2 text-slate-400"><X /></button>
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input required placeholder="Ex: João Silva" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação / Login (Só Números)</label>
              <input required placeholder="Digite o número" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:ring-2 focus:ring-blue-500 text-lg" value={login} onChange={e => setLogin(e.target.value.replace(/\D/g, ''))} />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Assistencial</label>
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                {[
                  { id: 'tecnico', label: 'Técnico', icon: Stethoscope },
                  { id: 'enfermeiro', label: 'Enfermeiro', icon: ShieldCheck },
                  isDev && { id: 'coordenacao', label: 'Coordenação', icon: Briefcase }
                ].filter(Boolean).map((p: any) => (
                  <button key={p.id} type="button" onClick={() => setRole(p.id as Role)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${role === p.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:bg-slate-200/50'}`}>
                    <p.icon className="w-4 h-4" /> {p.label}
                  </button>
                ))}
              </div>
           </div>
           <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setView('LIST')} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">Salvar Cadastro</button>
           </div>
        </form>
      )}

      {view === 'USERS_LIST' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <button onClick={() => setView('LIST')} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                 <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                 <input 
                   placeholder="Buscar por nome ou número..." 
                   className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 gap-3">
              {filteredCollaborators.map(c => {
                const status = getStatusDisplay(c);
                return (
                  <button 
                    key={c.id} 
                    onClick={() => { setSelectedUser(c); setView('USER_DETAIL'); }}
                    className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-400 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.role === 'coordenacao' ? 'bg-slate-800 text-white' : (c.role === 'enfermeiro' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white')}`}>
                          {c.role === 'coordenacao' ? <Briefcase className="w-6 h-6" /> : (c.role === 'enfermeiro' ? <ShieldCheck className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />)}
                       </div>
                       <div>
                          <p className="font-black text-slate-800 uppercase text-sm leading-tight group-hover:text-indigo-600 transition-colors">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                             {c.role === 'coordenacao' ? 'Coordenador' : (c.role === 'enfermeiro' ? 'Enfermeiro' : 'Técnico')} • Login: {c.login}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className={`hidden sm:flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
                          {status.text}
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
           </div>
        </div>
      )}

      {view === 'USER_DETAIL' && selectedUser && (
        <div className="max-w-xl mx-auto animate-in zoom-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                       <UserSearch className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight">{selectedUser.name}</h3>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">ID: {selectedUser.login}</p>
                    </div>
                 </div>
                 <button onClick={() => setView('USERS_LIST')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cargo</p>
                       <p className="font-black text-slate-800 uppercase text-xs">{selectedUser.role}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                       {(() => {
                         const status = getStatusDisplay(selectedUser);
                         return <p className={`font-black uppercase text-xs ${status.color}`}>{status.text}</p>
                       })()}
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 space-y-4">
                    {!selectedUser.isDeleted && (
                      <>
                        {/* Coordenador pode resetar sempre. Enfermeiro apenas se bloqueado. */}
                        {(isCoord || isDev || (isNurse && selectedUser.isBlocked)) && (
                          <button 
                            onClick={() => {
                              if(confirm(`Deseja resetar a senha de ${selectedUser.name}? A senha voltará para 1234 e o usuário deverá definir uma nova.`)) {
                                onUpdate(collaborators.map(c => c.id === selectedUser.id ? {...c, password: '1234', isBlocked: false, failedAttempts: 0} : c));
                                alert("Senha resetada com sucesso! Senha padrão temporária: 1234");
                                setView('USERS_LIST');
                              }
                            }}
                            className="w-full py-4 bg-orange-50 text-orange-600 font-black rounded-2xl border border-orange-200 hover:bg-orange-100 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-sm"
                          >
                             <RotateCcw className="w-4 h-4" /> Resetar Senha (1234)
                          </button>
                        )}

                        {/* Apenas Coordenador Master ou Dev podem excluir, mas nunca o Dev Master */}
                        {(isCoord || isDev) && selectedUser.login !== '5669' && (
                          <button 
                            onClick={() => {
                              if(confirm(`ATENÇÃO: Deseja realmente excluir o acesso de ${selectedUser.name}? Esta ação impedirá o login permanentemente.`)) {
                                onUpdate(collaborators.map(c => c.id === selectedUser.id ? {...c, isDeleted: true, isBlocked: true} : c));
                                alert("Usuário excluído com sucesso.");
                                setView('USERS_LIST');
                              }
                            }}
                            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-sm"
                          >
                             <UserMinus className="w-4 h-4" /> Excluir Usuário
                          </button>
                        )}

                        {isNurse && !selectedUser.isBlocked && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase leading-relaxed text-center">
                               Este usuário está ativo e operante. <br/> Apenas perfis bloqueados podem ter a senha resetada pela enfermagem.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {selectedUser.isDeleted && (
                       <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-center">
                          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <p className="text-xs font-black text-red-800 uppercase leading-relaxed text-center">
                             ESTE USUÁRIO FOI EXCLUÍDO DO SISTEMA. <br/> Apenas o desenvolvedor master (5669) pode cadastrar novamente.
                          </p>
                       </div>
                    )}
                 </div>

                 <button onClick={() => setView('USERS_LIST')} className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl uppercase text-[10px] tracking-widest">Voltar para Lista</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorManager;
