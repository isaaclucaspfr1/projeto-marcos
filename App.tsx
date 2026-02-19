
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, AppView, Patient, Role, Collaborator, LeanPatient } from './types';
import Layout from './components/Layout';
import PatientForm from './components/PatientForm';
import PatientList from './components/PatientList';
import Dashboard from './components/Dashboard';
import TransferManager from './components/TransferManager';
import InitiateTransfer from './components/InitiateTransfer';
import PendencyView from './components/PendencyView';
import ClearDataView from './components/ClearDataView';
import CollaboratorManager from './components/CollaboratorManager';
import ClinicalDecision from './components/ClinicalDecision';
import LeanPatientForm from './components/LeanPatientForm';
import LeanPatientList from './components/LeanPatientList';
import LeanDashboard from './components/LeanDashboard';
import AboutView from './components/AboutView';
import BrandLogo from './components/BrandLogo';
import { 
  UserPlus, 
  Users, 
  ArrowRightLeft, 
  FileWarning, 
  BarChart3, 
  Hospital,
  ChevronRight,
  Activity,
  ShieldCheck,
  Stethoscope,
  Eraser,
  UserCog,
  RefreshCcw,
  BrainCircuit,
  LogOut,
  Info,
  Sparkles,
  CheckSquare
} from 'lucide-react';

const safeSave = (key: string, data: any) => {
  try {
    const jsonString = JSON.stringify(data);
    const encodedData = btoa(encodeURIComponent(jsonString));
    localStorage.setItem(key, encodedData);
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

const safeLoad = (key: string) => {
  try {
    const data = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!data) return null;
    const decodedString = decodeURIComponent(atob(data));
    return JSON.parse(decodedString);
  } catch (e) {
    console.warn(`Error loading ${key}, clearing storage:`, e);
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return null;
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const sessionData = sessionStorage.getItem('hospflow_session_v5');
    if (!sessionData) return null;
    try {
      return JSON.parse(decodeURIComponent(atob(sessionData)));
    } catch {
      return null;
    }
  });

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return sessionStorage.getItem('hospflow_session_v5') ? 'UNIT_SELECTION' : 'LOGIN';
  });

  const [scannedData, setScannedData] = useState<Partial<Patient> | null>(null);
  const [tempAuthUser, setTempAuthUser] = useState<Collaborator | null>(null);
  
  const [patients, setPatients] = useState<Patient[]>(() => safeLoad('hospflow_patients_v5') || []);
  const [leanPatients, setLeanPatients] = useState<LeanPatient[]>(() => safeLoad('hospflow_lean_v5') || []);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    const saved = safeLoad('hospflow_collabs_v5');
    const defaultCollabs: Collaborator[] = [
      { id: '1', name: 'Coordenador Geral', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
      { id: '2', name: 'Coordenação Setorial', login: '1010', password: '1234', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
      { id: '3', name: 'Técnico Exemplo', login: '456', password: '1234', role: 'tecnico', failedAttempts: 0, isBlocked: false, isDeleted: false }
    ];
    return saved || defaultCollabs;
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSave('hospflow_patients_v5', patients);
      safeSave('hospflow_lean_v5', leanPatients);
      safeSave('hospflow_collabs_v5', collaborators);
    }, 2000);
    return () => clearTimeout(timer);
  }, [patients, leanPatients, collaborators]);

  useEffect(() => {
    const handleViewChange = (e: any) => setCurrentView(e.detail);
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      alert("ATENÇÃO: Por favor, selecione seu perfil (Técnico, Enfermeiro ou Coordenação) para continuar.");
      return;
    }
    const foundIndex = collaborators.findIndex(c => {
      if (username === '5669') return c.login === '5669' && !c.isDeleted;
      return c.login === username && c.role === selectedRole && !c.isDeleted;
    });
    if (foundIndex === -1) {
      alert("USUÁRIO NÃO ENCONTRADO: O número informado não está cadastrado como " + (selectedRole === 'tecnico' ? 'Técnico' : selectedRole === 'enfermeiro' ? 'Enfermeiro' : 'Coordenação') + ".");
      return;
    }
    const found = collaborators[foundIndex];
    if (found.isBlocked) {
      alert("USUÁRIO BLOQUEADO: Limite de tentativas excedido. Procure a Coordenação para resetar sua senha.");
      return;
    }
    if (found.password === password) {
      const updatedCollabs = [...collaborators];
      updatedCollabs[foundIndex] = { ...found, failedAttempts: 0 };
      setCollaborators(updatedCollabs);
      if (password === '1234') {
        setTempAuthUser(found);
        setCurrentView('CHANGE_PASSWORD');
        return;
      }
      const authUser: User = { id: found.id, username: found.login, role: selectedRole, name: found.name };
      sessionStorage.setItem('hospflow_session_v5', btoa(encodeURIComponent(JSON.stringify(authUser))));
      localStorage.removeItem('hospflow_session_v5');
      setUser(authUser);
      setCurrentView('UNIT_SELECTION');
      setUsername('');
      setPassword('');
    } else {
      const updatedCollabs = [...collaborators];
      const attempts = found.failedAttempts + 1;
      const blocked = attempts >= 3;
      updatedCollabs[foundIndex] = { ...found, failedAttempts: attempts, isBlocked: blocked };
      setCollaborators(updatedCollabs);
      if (blocked) alert("USUÁRIO BLOQUEADO: Você errou a senha 3 vezes. Procure a Coordenação.");
      else alert(`SENHA INCORRETA: Verifique sua senha numérica. Tentativa ${attempts} de 3. Após 3 erros o usuário será bloqueado.`);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(newPassword)) { alert("A senha deve conter apenas números."); return; }
    if (newPassword === '1234') { alert("Você não pode usar a senha padrão como sua nova senha."); return; }
    if (tempAuthUser) {
      const updatedCollabs = collaborators.map(c => 
        c.id === tempAuthUser.id ? { ...c, password: newPassword, failedAttempts: 0, isBlocked: false } : c
      );
      setCollaborators(updatedCollabs);
      const authUser: User = { id: tempAuthUser.id, username: tempAuthUser.login, role: tempAuthUser.role, name: tempAuthUser.name };
      sessionStorage.setItem('hospflow_session_v5', btoa(encodeURIComponent(JSON.stringify(authUser))));
      setUser(authUser);
      setTempAuthUser(null);
      setCurrentView('UNIT_SELECTION');
      alert("Senha pessoal definida com sucesso!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hospflow_session_v5');
    sessionStorage.removeItem('hospflow_session_v5');
    setUser(null);
    setSelectedUnit(null);
    setCurrentView('LOGIN');
    setSelectedRole(null);
    setUsername('');
    setPassword('');
  };

  const addPatient = useCallback((p: Partial<Patient>) => {
    const isUpa = p.status === 'Transferência UPA';
    const isAutoTransfer = isUpa || p.status === 'Transferência Externa';
    const newP: Patient = {
      ...p as Patient,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: `${user?.username} - ${user?.name}`,
      lastModifiedBy: `${user?.username} - ${user?.name}`,
      isTransferRequested: isAutoTransfer,
      transferDestinationSector: isAutoTransfer ? p.status : undefined,
      transferDestinationBed: isUpa ? 'UPA' : (isAutoTransfer ? 'AGUARDANDO' : undefined),
      isTransferred: false,
      isNew: true // Marca como novo para notificação do enfermeiro/coord
    };
    setPatients(prev => [newP, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
  }, [user]);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) return { ...p, ...updates, lastModifiedBy: `${user?.username} - ${user?.name}` };
      return p;
    }).sort((a, b) => a.name.localeCompare(b.name)));
  }, [user]);

  const updatePatients = useCallback((ids: string[], updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => {
      if (ids.includes(p.id)) return { ...p, ...updates, lastModifiedBy: `${user?.username} - ${user?.name}` };
      return p;
    }).sort((a, b) => a.name.localeCompare(b.name)));
  }, [user]);

  const deletePatients = useCallback((ids: string[]) => {
    setPatients(prev => prev.filter(p => !ids.includes(p.id)));
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'MAIN_MENU':
        const btnBase = "flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-md transition-all active:scale-95 group h-32 relative text-center";
        const pendencyCount = patients.filter(p => !p.isTransferred && (p.pendencies !== 'Nenhuma' || !p.hasBracelet || !p.hasBedIdentification)).length;
        const transferRequestCount = patients.filter(p => p.isTransferRequested && !p.isTransferred).length;
        const newPatientsCount = patients.filter(p => p.isNew && !p.isTransferred).length;

        const badge = (count: number, color: string) => count > 0 ? (
          <span className={`absolute top-2 right-2 w-5 h-5 ${count > 0 ? color : ''} text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse`}>
            {count}
          </span>
        ) : null;

        const menuButtons = {
          decisaoClinica: (
            <button key="decisao" onClick={() => setCurrentView('CLINICAL_DECISION')} className={btnBase}>
              <BrainCircuit className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Decisão Clínica</span>
            </button>
          ),
          listaPacientes: (
            <button key="lista" onClick={() => setCurrentView('PATIENT_LIST')} className={btnBase}>
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Lista de Pacientes</span>
              {user?.role !== 'tecnico' && badge(newPatientsCount, 'bg-orange-500')}
            </button>
          ),
          dashboard: (
            <button key="dash" onClick={() => setCurrentView('DASHBOARD')} className={btnBase}>
              <BarChart3 className="w-8 h-8 text-sky-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Dashboard</span>
            </button>
          ),
          novoPaciente: (
            <button key="novo" onClick={() => setCurrentView('NEW_PATIENT')} className={btnBase}>
              <UserPlus className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Novo Paciente</span>
            </button>
          ),
          pendencias: (
            <button key="pend" onClick={() => setCurrentView('PENDENCIES')} className={btnBase}>
              <FileWarning className="w-8 h-8 text-amber-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Pendências</span>
              {badge(pendencyCount, 'bg-red-600')}
            </button>
          ),
          transferirPacientes: (
            <button key="transferir" onClick={() => setCurrentView('INITIATE_TRANSFER')} className={btnBase}>
              <ArrowRightLeft className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Transferir Pacientes</span>
            </button>
          ),
          transferencias: (
            <button key="transfs" onClick={() => setCurrentView('TRANSFERS')} className={btnBase}>
              <ArrowRightLeft className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Transferências</span>
              {badge(transferRequestCount, 'bg-orange-500')}
            </button>
          ),
          pacientesFinalizados: (
            <button key="finalizados" onClick={() => setCurrentView('FINALIZED_PATIENTS')} className={btnBase}>
              <CheckSquare className="w-8 h-8 text-emerald-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Pacientes Finalizados</span>
            </button>
          ),
          monitoramentoLean: (
            <button key="lean" onClick={() => setCurrentView('LEAN_MENU')} className={btnBase}>
              <Activity className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Monitoramento Lean</span>
            </button>
          ),
          equipes: (
            <button key="equipes" onClick={() => setCurrentView('COLLABORATORS')} className={btnBase}>
              <UserCog className="w-8 h-8 text-slate-800 mb-2" />
              <span className="text-xs font-bold text-slate-700">Equipe</span>
            </button>
          ),
          mudarUnidade: (
            <button key="unidade" onClick={() => { setSelectedUnit(null); setCurrentView('UNIT_SELECTION'); }} className={btnBase}>
              <RefreshCcw className="w-8 h-8 text-blue-400 mb-2" />
              <span className="text-xs font-bold text-slate-700">Mudar Unidade</span>
            </button>
          ),
          limparDados: (
            <button key="limpar" onClick={() => setCurrentView('CLEAR_DATA')} className={btnBase}>
              <Eraser className="w-8 h-8 text-red-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">Limpar Dados</span>
            </button>
          ),
          sobreApp: (
            <button key="sobre" onClick={() => setCurrentView('ABOUT_APP')} className={btnBase}>
              <Info className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Sobre o App</span>
            </button>
          )
        };

        const coordinationMenu = [
          menuButtons.decisaoClinica,
          menuButtons.listaPacientes,
          menuButtons.dashboard,
          menuButtons.novoPaciente,
          menuButtons.pendencias,
          menuButtons.transferirPacientes,
          menuButtons.transferencias,
          menuButtons.pacientesFinalizados,
          menuButtons.monitoramentoLean,
          menuButtons.equipes,
          menuButtons.mudarUnidade,
          menuButtons.limparDados,
          menuButtons.sobreApp
        ];

        const nurseMenu = [
          menuButtons.decisaoClinica,
          menuButtons.listaPacientes,
          menuButtons.novoPaciente,
          menuButtons.transferirPacientes,
          menuButtons.transferencias,
          menuButtons.pendencias,
          menuButtons.dashboard,
          menuButtons.pacientesFinalizados,
          menuButtons.monitoramentoLean,
          menuButtons.equipes,
          menuButtons.mudarUnidade,
          menuButtons.limparDados,
          menuButtons.sobreApp
        ];

        const technicianMenu = [
          menuButtons.novoPaciente,
          menuButtons.listaPacientes,
          menuButtons.transferencias,
          menuButtons.pendencias,
          menuButtons.pacientesFinalizados,
          menuButtons.dashboard,
          menuButtons.monitoramentoLean,
          menuButtons.mudarUnidade,
          menuButtons.sobreApp
        ];

        let finalMenu = technicianMenu;
        if (user?.role === 'coordenacao') finalMenu = coordinationMenu;
        else if (user?.role === 'enfermeiro') finalMenu = nurseMenu;

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {finalMenu}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 flex-col">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-blue-600 p-10 text-center">
                <Activity className="w-12 h-12 text-white mx-auto mb-4" />
                <h1 className="text-3xl font-black text-white tracking-tighter">HospFlow</h1>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-0.3em mt-1">Gestão de Enfermagem</p>
              </div>
              <form onSubmit={handleLogin} className="p-8 space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  {['tecnico', 'enfermeiro', 'coordenacao'].map((r) => (
                    <button key={r} type="button" onClick={() => setSelectedRole(r as Role)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedRole === r ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:bg-slate-200/50'}`}>
                      {r === 'coordenacao' ? 'Coord.' : r === 'enfermeiro' ? 'Enf.' : 'Técnico'}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário (Números)</label>
                    <input required type="text" inputMode="numeric" placeholder="USUÁRIO" autoComplete="off" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={username} onChange={e => setUsername(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha (Números)</label>
                    <input required type="password" inputMode="numeric" placeholder="SENHA" autoComplete="off" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase text-center leading-relaxed">Sessão Segura: O sistema desconectará automaticamente ao fechar a aba ou navegador.</p>
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase text-xs tracking-widest">Acessar Sistema</button>
              </form>
            </div>
            <div className="flex flex-col items-center mt-2">
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-3">Criado por:</p>
              <BrandLogo />
            </div>
          </div>
        );

      case 'CHANGE_PASSWORD':
        return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 flex-col">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
               <div className="bg-slate-900 p-10 text-center">
                  <RefreshCcw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin-slow" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nova Senha Pessoal</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">Segurança Obrigatória</p>
               </div>
               <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                     <p className="text-[10px] font-black text-amber-800 uppercase leading-relaxed text-center">
                        Detectamos que você está usando a senha padrão. Para sua segurança, defina uma nova senha numérica agora.
                     </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digite sua nova senha (Apenas números)</label>
                    <input required autoFocus type="password" inputMode="numeric" placeholder="NOVA SENHA" className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-center text-2xl tracking-[0.5em]" value={newPassword} onChange={e => setNewPassword(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase text-xs tracking-widest">Salvar e Acessar</button>
               </form>
            </div>
          </div>
        );

      case 'UNIT_SELECTION':
        return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {['UPA Noroeste', 'Hospital Odilon Behrens'].map(unit => (
                <button key={unit} onClick={() => { setSelectedUnit(unit); setCurrentView('MAIN_MENU'); }} className="bg-white p-10 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all text-left group">
                  <Hospital className="w-12 h-12 text-slate-300 group-hover:text-blue-600 mb-6 transition-colors" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{unit}</h3>
                  <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">Selecionar <ChevronRight className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'PATIENT_LIST': return <PatientList patients={patients} role={user?.role || 'tecnico'} onDeletePatients={deletePatients} onUpdatePatients={updatePatients} onEdit={p => { setScannedData(p); setCurrentView('NEW_PATIENT'); }} />;
      case 'DASHBOARD': return <Dashboard patients={patients} />;
      case 'CLINICAL_DECISION': return <ClinicalDecision patients={patients} onUpdatePatient={updatePatient} />;
      case 'INITIATE_TRANSFER': return <InitiateTransfer patients={patients} onUpdatePatient={updatePatient} onCancel={() => setCurrentView('MAIN_MENU')} />;
      case 'TRANSFERS': return <TransferManager role={user?.role || 'tecnico'} patients={patients} onUpdatePatient={updatePatient} />;
      case 'FINALIZED_PATIENTS': return <TransferManager role={user?.role || 'tecnico'} patients={patients} onUpdatePatient={updatePatient} historyView onDeletePatients={deletePatients} />;
      case 'PENDENCIES': return <PendencyView patients={patients} onUpdatePatient={updatePatient} role={user?.role || 'tecnico'} />;
      case 'CLEAR_DATA': return <ClearDataView patients={patients} onDeletePatients={deletePatients} />;
      case 'COLLABORATORS': return <CollaboratorManager user={user!} collaborators={collaborators} onUpdate={setCollaborators} onCancel={() => setCurrentView('MAIN_MENU')} />;
      case 'ABOUT_APP': return <AboutView user={user!} onBack={() => setCurrentView('MAIN_MENU')} />;
      case 'NEW_PATIENT': return <PatientForm onSave={(p) => { if (scannedData && scannedData.id) { updatePatient(scannedData.id, p); setScannedData(null); setCurrentView('PATIENT_LIST'); } else { addPatient(p); } }} onCancel={() => { setScannedData(null); setCurrentView('MAIN_MENU'); }} initialData={scannedData || undefined} />;
      default: return null;
    }
  };

  if (['LOGIN', 'UNIT_SELECTION', 'CHANGE_PASSWORD'].includes(currentView)) return renderContent();

  return (
    <Layout user={user!} currentView={currentView} selectedUnit={selectedUnit} onBack={() => setCurrentView('MAIN_MENU')} onLogout={handleLogout} title={currentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
