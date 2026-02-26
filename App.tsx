
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
import AboutView from './components/AboutView';
import LeanDashboard from './components/LeanDashboard';
import LeanPatientList from './components/LeanPatientList';
import LeanPatientForm from './components/LeanPatientForm';
import { 
  UserPlus, 
  Users, 
  ArrowRightLeft, 
  FileWarning, 
  BarChart3, 
  Hospital,
  ChevronRight,
  Activity,
  Eraser,
  UserCog,
  RefreshCcw,
  BrainCircuit,
  CheckSquare,
  Info,
  TrendingUp,
  LayoutDashboard,
  Stethoscope,
  Sparkles,
  Bell,
  X
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
    return null;
  }
};

const MALogo = React.memo(({ size = "w-14 h-14" }: { size?: string }) => (
  <div className={`flex flex-col items-center justify-center ${size} group`}>
    <div className="relative">
      <Stethoscope className="w-full h-full text-emerald-500" />
      <div className="absolute -top-1 -right-1">
        <Sparkles className="w-1/2 h-1/2 text-yellow-400 animate-pulse fill-yellow-400" />
      </div>
    </div>
    <span className="text-[10px] font-black text-slate-800 mt-0.5 tracking-tighter">MA</span>
  </div>
));

const api = {
  getPatients: () => fetch('/api/patients').then(r => r.json()),
  savePatient: (p: Patient) => fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }),
  deletePatient: (id: string) => fetch(`/api/patients/${id}`, { method: 'DELETE' }),
  bulkDeletePatients: (ids: string[]) => fetch('/api/patients/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }),
  getLeanPatients: () => fetch('/api/lean-patients').then(r => r.json()),
  saveLeanPatient: (p: LeanPatient) => fetch('/api/lean-patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }),
  deleteLeanPatient: (id: string) => fetch(`/api/lean-patients/${id}`, { method: 'DELETE' }),
  getCollaborators: () => fetch('/api/collaborators').then(r => r.json()),
  saveCollaborator: (c: Collaborator) => fetch('/api/collaborators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }),
  deleteCollaborator: (id: string) => fetch(`/api/collaborators/${id}`, { method: 'DELETE' }),
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
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [leanPatients, setLeanPatients] = useState<LeanPatient[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPendencyReminder, setShowPendencyReminder] = useState(false);
  const hasCheckedOnLogin = React.useRef(false);

  // Carregar dados iniciais do banco de dados
  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, lp, c] = await Promise.all([
          api.getPatients(),
          api.getLeanPatients(),
          api.getCollaborators()
        ]);
        setPatients(p);
        setLeanPatients(lp);
        setCollaborators(c);
      } catch (e) {
        console.error("Erro ao carregar dados do servidor:", e);
      }
    };
    loadData();
  }, []);

  // Sistema de Lembrete de Pendências
  useEffect(() => {
    if (!user) {
      hasCheckedOnLogin.current = false;
      setShowPendencyReminder(false);
      return;
    }

    const checkPendencies = () => {
      const pendencyCount = patients.filter(p => !p.isTransferred && (p.pendencies !== 'Nenhuma' || !p.hasBracelet || !p.hasBedIdentification)).length;
      if (pendencyCount > 0) {
        setShowPendencyReminder(true);
      }
    };

    // Verificação imediata ao logar (apenas para Técnico e Enfermeiro)
    if (!hasCheckedOnLogin.current && patients.length > 0) {
      if (user.role === 'tecnico' || user.role === 'enfermeiro') {
        checkPendencies();
      }
      hasCheckedOnLogin.current = true;
    }

    // Intervalo de 30 minutos (1800000 ms)
    const interval = setInterval(checkPendencies, 1800000);

    return () => {
      clearInterval(interval);
    };
  }, [user, patients]);

  useEffect(() => {
    const handleViewChange = (e: any) => setCurrentView(e.detail);
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  const handleLogin = useCallback((e: React.FormEvent) => {
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
      alert("USUÁRIO NÃO ENCONTRADO: Verifique os dados ou procure a coordenação.");
      return;
    }
    const found = collaborators[foundIndex];
    if (found.isBlocked) {
      alert("USUÁRIO BLOQUEADO: Limite de tentativas excedido. Procure o Enfermeiro ou a Coordenação para resetar sua senha.");
      return;
    }
    if (found.password === password) {
      const updatedCollabs = [...collaborators];
      const updatedCollab = { ...found, failedAttempts: 0 };
      updatedCollabs[foundIndex] = updatedCollab;
      setCollaborators(updatedCollabs);
      api.saveCollaborator(updatedCollab);
      
      if (password === '1234') {
        setTempAuthUser(found);
        setCurrentView('CHANGE_PASSWORD');
        return;
      }
      const authUser: User = { id: found.id, username: found.login, role: selectedRole, name: found.name };
      sessionStorage.setItem('hospflow_session_v5', btoa(encodeURIComponent(JSON.stringify(authUser))));
      setUser(authUser);
      setCurrentView('UNIT_SELECTION');
      setUsername('');
      setPassword('');
    } else {
      const updatedCollabs = [...collaborators];
      const attempts = found.failedAttempts + 1;
      const blocked = attempts >= 3;
      const updatedCollab = { ...found, failedAttempts: attempts, isBlocked: blocked };
      updatedCollabs[foundIndex] = updatedCollab;
      setCollaborators(updatedCollabs);
      api.saveCollaborator(updatedCollab);
      
      if (blocked) alert("SENHA BLOQUEADA: Você errou a senha 3 vezes. Procure seu superior para resetar sua senha.");
      else alert(`SENHA INCORRETA: Tentativa ${attempts} de 3. Após 3 erros o usuário será bloqueado.`);
    }
  }, [collaborators, username, password, selectedRole]);

  const handleUpdatePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(newPassword)) { alert("A senha deve conter apenas números."); return; }
    if (newPassword.length > 6) { alert("A nova senha deve ter no máximo 6 dígitos."); return; }
    if (newPassword === '1234') { alert("Você não pode usar a senha padrão como sua nova senha."); return; }
    
    if (tempAuthUser) {
      const updatedCollab = { ...tempAuthUser, password: newPassword, failedAttempts: 0, isBlocked: false };
      const updatedCollabs = collaborators.map(c => 
        c.id === tempAuthUser.id ? updatedCollab : c
      );
      setCollaborators(updatedCollabs);
      api.saveCollaborator(updatedCollab);
      
      const authUser: User = { id: tempAuthUser.id, username: tempAuthUser.login, role: tempAuthUser.role, name: tempAuthUser.name };
      sessionStorage.setItem('hospflow_session_v5', btoa(encodeURIComponent(JSON.stringify(authUser))));
      setUser(authUser);
      setTempAuthUser(null);
      setNewPassword('');
      setCurrentView('UNIT_SELECTION');
      alert("Senha pessoal definida com sucesso!");
    }
  }, [collaborators, newPassword, tempAuthUser]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('hospflow_session_v5');
    setUser(null);
    setSelectedUnit(null);
    setCurrentView('LOGIN');
    setSelectedRole(null);
    setUsername('');
    setPassword('');
  }, []);

  const addPatient = useCallback(async (p: Partial<Patient>) => {
    const isUpa = p.status === 'Transferência UPA';
    const isExternal = p.status === 'Transferência Externa';
    const isAutoTransfer = isUpa || isExternal;
    const now = new Date().toISOString();
    
    const newP: Patient = {
      ...p as Patient,
      id: crypto.randomUUID(),
      createdAt: now,
      createdBy: `${user?.username} - ${user?.name}`,
      lastModifiedBy: `${user?.username} - ${user?.name}`,
      isTransferRequested: isAutoTransfer,
      transferRequestedAt: isAutoTransfer ? now : undefined,
      upaTransferRequestedAt: isUpa ? now : undefined,
      externalTransferRequestedAt: isExternal ? now : undefined,
      pendenciesResolvedAt: p.pendencies === 'Nenhuma' ? now : undefined,
      transferDestinationSector: isAutoTransfer ? p.status : undefined,
      transferDestinationBed: isUpa ? 'UPA' : (isAutoTransfer ? 'AGUARDANDO' : undefined),
      isTransferred: false,
      isNew: true
    };
    setPatients(prev => [newP, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    await api.savePatient(newP);
  }, [user]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
    let updatedP: Patient | undefined;
    const now = new Date().toISOString();
    
    setPatients(prev => {
      const newList = prev.map(p => {
        if (p.id === id) {
          const finalUpdates = { ...updates };
          
          // Monitoramento de Pendências
          if (p.pendencies !== 'Nenhuma' && updates.pendencies === 'Nenhuma') {
            finalUpdates.pendenciesResolvedAt = now;
          }
          
          // Monitoramento de Solicitação de Transferência
          if (!p.isTransferRequested && updates.isTransferRequested === true) {
            finalUpdates.transferRequestedAt = now;
          }
          
          // Monitoramento de UPA/Externa
          if (p.status !== 'Transferência UPA' && updates.status === 'Transferência UPA') {
            finalUpdates.upaTransferRequestedAt = now;
          }
          if (p.status !== 'Transferência Externa' && updates.status === 'Transferência Externa') {
            finalUpdates.externalTransferRequestedAt = now;
          }
          
          // Monitoramento de Conclusão
          if (!p.isTransferred && updates.isTransferred === true) {
            finalUpdates.transferredAt = now;
          }

          updatedP = { ...p, ...finalUpdates, lastModifiedBy: `${user?.username} - ${user?.name}` };
          return updatedP;
        }
        return p;
      });
      return [...newList].sort((a, b) => a.name.localeCompare(b.name));
    });
    if (updatedP) await api.savePatient(updatedP);
  }, [user]);

  const updatePatients = useCallback(async (ids: string[], updates: Partial<Patient>) => {
    const updatedList: Patient[] = [];
    setPatients(prev => {
      const newList = prev.map(p => {
        if (ids.includes(p.id)) {
          const newP = { ...p, ...updates, lastModifiedBy: `${user?.username} - ${user?.name}` };
          updatedList.push(newP);
          return newP;
        }
        return p;
      });
      return [...newList].sort((a, b) => a.name.localeCompare(b.name));
    });
    for (const p of updatedList) await api.savePatient(p);
  }, [user]);

  const deletePatients = useCallback(async (ids: string[]) => {
    setPatients(prev => prev.filter(p => !ids.includes(p.id)));
    await api.bulkDeletePatients(ids);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'MAIN_MENU':
        const btnBase = "flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-md transition-all active:scale-95 group h-32 relative text-center";
        const pendencyCount = patients.filter(p => !p.isTransferred && (p.pendencies !== 'Nenhuma' || !p.hasBracelet || !p.hasBedIdentification)).length;
        const transferRequestCount = patients.filter(p => p.isTransferRequested && !p.isTransferred).length;
        const newPatientsCount = patients.filter(p => p.isNew && !p.isTransferred).length;

        const badge = (count: number, color: string) => count > 0 ? (
          <span className={`absolute top-2 right-2 w-5 h-5 ${count > 5 ? 'bg-red-600' : color} text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse`}>
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
          equipes: (
            <button key="equipes" onClick={() => setCurrentView('COLLABORATORS')} className={btnBase}>
              <UserCog className="w-8 h-8 text-slate-800 mb-2" />
              <span className="text-xs font-bold text-slate-700">
                {user?.role === 'coordenacao' ? 'Usuários' : (user?.role === 'enfermeiro' ? 'Consultar Usuários' : 'Equipe')}
              </span>
            </button>
          ),
          leanMonitoramento: (
            <button key="lean" onClick={() => setCurrentView('LEAN_MENU')} className={btnBase}>
              <TrendingUp className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Monitoramento Lean</span>
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
          menuButtons.leanMonitoramento,
          menuButtons.novoPaciente,
          menuButtons.pendencias,
          menuButtons.transferirPacientes,
          menuButtons.transferencias,
          menuButtons.pacientesFinalizados,
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
          menuButtons.leanMonitoramento,
          menuButtons.pendencias,
          menuButtons.dashboard,
          menuButtons.pacientesFinalizados,
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
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase text-xs tracking-widest">Acessar Sistema</button>
              </form>
            </div>
            
            <div className="flex flex-col items-center gap-2 mt-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Criado e Desenvolvido por:</span>
              <MALogo size="w-16 h-16" />
            </div>
          </div>
        );

      case 'LEAN_MENU':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => setCurrentView('LEAN_CADASTRO')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all flex flex-col items-center group">
                 <div className="p-4 bg-blue-600 text-white rounded-3xl mb-4 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-8 h-8" />
                 </div>
                 <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Novo Cadastro Lean</span>
              </button>
              <button onClick={() => setCurrentView('LEAN_LIST')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all flex flex-col items-center group">
                 <div className="p-4 bg-indigo-600 text-white rounded-3xl mb-4 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-8 h-8" />
                 </div>
                 <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Lista de Monitoramento</span>
              </button>
              <button onClick={() => setCurrentView('LEAN_NURSE_SUMMARY')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all flex flex-col items-center group">
                 <div className="p-4 bg-emerald-600 text-white rounded-3xl mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-8 h-8" />
                 </div>
                 <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Dashboard Lean</span>
              </button>
            </div>
            <button onClick={() => setCurrentView('MAIN_MENU')} className="w-full py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Voltar ao Menu Principal</button>
          </div>
        );

      case 'LEAN_CADASTRO': return <LeanPatientForm onSave={async (p) => { 
        setLeanPatients(prev => [...prev, p]); 
        await api.saveLeanPatient(p);
        setCurrentView('LEAN_LIST'); 
      }} onCancel={() => setCurrentView('LEAN_MENU')} />;
      case 'LEAN_LIST': return <LeanPatientList patients={leanPatients} onUpdate={async (newList) => {
        // Identificar o que mudou para sincronizar com o banco
        if (newList.length < leanPatients.length) {
          // Deleção
          const deleted = leanPatients.find(p => !newList.some(np => np.id === p.id));
          if (deleted) await api.deleteLeanPatient(deleted.id);
        } else {
          // Adição ou Edição
          const changed = newList.find(np => {
            const old = leanPatients.find(p => p.id === np.id);
            return !old || JSON.stringify(old) !== JSON.stringify(np);
          });
          if (changed) await api.saveLeanPatient(changed);
        }
        setLeanPatients(newList);
      }} onCancel={() => setCurrentView('LEAN_MENU')} />;
      case 'LEAN_NURSE_SUMMARY': return <LeanDashboard patients={leanPatients} unit={selectedUnit || ''} onCancel={() => setCurrentView('LEAN_MENU')} />;
      case 'CHANGE_PASSWORD': return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 flex-col">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
             <div className="bg-slate-900 p-10 text-center">
                <RefreshCcw className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nova Senha Pessoal</h2>
             </div>
             <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
                   <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Defina sua nova senha numérica pessoal (máximo de 6 dígitos).</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha (Só Números)</label>
                  <input required autoFocus type="password" inputMode="numeric" maxLength={6} placeholder="NOVA SENHA" className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-center text-2xl tracking-[0.5em]" value={newPassword} onChange={e => setNewPassword(e.target.value.replace(/\D/g, ''))} />
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">Salvar e Acessar</button>
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
      case 'DASHBOARD': return <Dashboard patients={patients} role={user?.role || 'tecnico'} />;
      case 'CLINICAL_DECISION': return <ClinicalDecision patients={patients} onUpdatePatient={updatePatient} />;
      case 'INITIATE_TRANSFER': return <InitiateTransfer patients={patients} onUpdatePatient={updatePatient} onCancel={() => setCurrentView('MAIN_MENU')} />;
      case 'TRANSFERS': return <TransferManager role={user?.role || 'tecnico'} patients={patients} onUpdatePatient={updatePatient} />;
      case 'FINALIZED_PATIENTS': return <TransferManager role={user?.role || 'tecnico'} patients={patients} onUpdatePatient={updatePatient} historyView onDeletePatients={deletePatients} />;
      case 'PENDENCIES': return <PendencyView patients={patients} onUpdatePatient={updatePatient} role={user?.role || 'tecnico'} />;
      case 'CLEAR_DATA': return <ClearDataView patients={patients} onDeletePatients={deletePatients} />;
      case 'COLLABORATORS': return <CollaboratorManager user={user!} collaborators={collaborators} onCancel={() => setCurrentView('MAIN_MENU')} onUpdate={async (newList) => {
        try {
          // Sincronizar colaborador alterado ou novo
          const changed = newList.find(nc => {
            const old = collaborators.find(c => c.id === nc.id);
            return !old || JSON.stringify(old) !== JSON.stringify(nc);
          });
          if (changed) await api.saveCollaborator(changed);
          setCollaborators(newList);
        } catch (e) {
          console.error("Erro ao salvar colaborador:", e);
          alert("ERRO DE SINCRONIZAÇÃO: Não foi possível salvar os dados no servidor. Verifique sua conexão.");
        }
      }} />;
      case 'ABOUT_APP': return <AboutView user={user!} onBack={() => setCurrentView('MAIN_MENU')} />;
      case 'NEW_PATIENT': return <PatientForm onSave={(p) => { if (scannedData && scannedData.id) { updatePatient(scannedData.id, p); setScannedData(null); setCurrentView('PATIENT_LIST'); } else { addPatient(p); } }} onCancel={() => { setScannedData(null); setCurrentView('MAIN_MENU'); }} initialData={scannedData || undefined} />;
      default: return null;
    }
  };

  if (['LOGIN', 'UNIT_SELECTION', 'CHANGE_PASSWORD'].includes(currentView)) return renderContent();

  return (
    <Layout user={user!} currentView={currentView} selectedUnit={selectedUnit} onBack={() => setCurrentView('MAIN_MENU')} onLogout={handleLogout} title={currentView}>
      {renderContent()}
      
      {/* Notificação Flutuante de Pendências */}
      {showPendencyReminder && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div 
            onClick={() => {
              setCurrentView('PENDENCIES');
              setShowPendencyReminder(false);
            }}
            className="bg-white border-2 border-amber-500 rounded-3xl shadow-2xl p-5 flex items-center gap-4 cursor-pointer hover:bg-amber-50 transition-all group"
          >
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Lembrete de Pendências</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Existem pacientes com pendências aguardando sua atenção.
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPendencyReminder(false);
              }}
              className="p-2 text-slate-300 hover:text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
