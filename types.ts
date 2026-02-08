
export type Role = 'enfermeiro' | 'tecnico' | 'coordenacao';

export type AppView = 
  | 'LOGIN' 
  | 'UNIT_SELECTION' 
  | 'MAIN_MENU' 
  | 'NEW_PATIENT' 
  | 'PATIENT_LIST' 
  | 'DASHBOARD' 
  | 'INITIATE_TRANSFER' 
  | 'TRANSFERS' 
  | 'FINALIZED_PATIENTS' 
  | 'PENDENCIES' 
  | 'CLEAR_DATA' 
  | 'COLLABORATORS' 
  | 'CLINICAL_DECISION'
  | 'LEAN_MENU'
  | 'LEAN_CADASTRO'
  | 'LEAN_LIST'
  | 'LEAN_NURSE_SUMMARY'
  | 'ABOUT_APP'
  | 'CHANGE_PASSWORD';

export type Corridor = 'Corredor 1 | Principal' | 'Corredor 2 | Comanejo' | 'Corredor 3 | Raio-X' | 'Sala de Trauma';
export type Specialty = 'Cirurgia Geral' | 'Neurologia' | 'Ortopedia' | 'Urologia' | 'Odontologia/Bucomaxilo' | 'Vascular' | 'Clínica Médica' | 'Outros';
export type LeanSpecialty = 'Cirurgia Geral' | 'Neurologia' | 'Ortopedia' | 'Dentista/Bucomaxilo' | 'Vascular';
export type PatientStatus = 'Internado' | 'Observação' | 'Reavaliação' | 'Alta' | 'Transferência UPA' | 'Transferência Externa';
export type PendencyType = 'Nenhuma' | 'Sem prescrição médica' | 'Sem dieta' | 'Aguardando exames laboratoriais' | 'Aguardando Tomografia' | 'Aguardando Raio-X' | 'Aguardando Ultrassom' | 'Exames realizados, aguardando resultado' | 'Aguardando Assistente Social';
export type DietType = 'Sem prescrição' | 'Suspensa' | 'Livre' | 'Pastosa' | 'Branda' | 'Líquida' | 'Laxativa' | 'DM' | 'HAS';

export interface VitalSigns {
  pa?: string;
  fc?: number;
  fr?: number;
  temp?: number;
  spo2?: number;
  measuredAt?: string;
}

export interface Patient {
  id: string;
  name: string;
  socialName?: string;
  sex?: 'Masculino' | 'Feminino' | 'Outro';
  age?: number;
  medicalRecord: string;
  corridor: Corridor;
  specialty: Specialty;
  status: PatientStatus;
  hasAIH: boolean;
  pendencies: PendencyType;
  diagnosis: string;
  mobility: 'Deambula' | 'Deambula com auxilio' | 'Acamado' | 'Restrito ao leito';
  hasAllergy: boolean;
  allergyDetails: string;
  venousAccess: string;
  venousAccessDate?: string;
  hasPrescription: boolean;
  diet: DietType[];
  disabilities?: string[];
  notes: string;
  createdAt: string;
  createdBy: string;
  lastModifiedBy: string;
  hasBracelet: boolean;
  hasBedIdentification: boolean;
  situation: 'Maca' | 'Cadeira';
  hasLesion: boolean;
  lesionDescription: string;
  isTransferRequested: boolean;
  transferDestinationSector?: string;
  transferDestinationBed?: string;
  isTransferred: boolean;
  transferredAt?: string;
  vitals?: VitalSigns;
  isNew?: boolean;
}

export interface LeanPatient {
  id: string;
  name: string;
  age: number;
  medicalRecord: string;
  specialty: LeanSpecialty;
  receptionTime: string;
  triageStartTime?: string;
  mdStartTime?: string;
  mdEndTime?: string;
  labTime?: string;
  ctTime?: string;
  xrayTime?: string;
  medicationTime?: string;
  reevaluationTime?: string;
  dischargeTime?: string;
  hospitalizationTime?: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

export interface Collaborator {
  id: string;
  name: string;
  login: string;
  password: string;
  role: Role;
  failedAttempts: number;
  isBlocked: boolean;
  isDeleted: boolean;
}
