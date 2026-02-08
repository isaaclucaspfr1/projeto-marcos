
import { Corridor, Specialty, PatientStatus, PendencyType, DietType, LeanSpecialty } from './types';

export const CORRIDORS: Corridor[] = [
  'Corredor 1 | Principal', 
  'Corredor 2 | Comanejo', 
  'Corredor 3 | Raio-X',
  'Sala de Trauma'
];

export const SPECIALTIES: Specialty[] = [
  'Cirurgia Geral',
  'Neurologia',
  'Ortopedia',
  'Urologia',
  'Odontologia/Bucomaxilo',
  'Vascular',
  'Clínica Médica',
  'Outros'
];

export const LEAN_SPECIALTIES: LeanSpecialty[] = [
  'Cirurgia Geral',
  'Neurologia',
  'Ortopedia',
  'Dentista/Bucomaxilo',
  'Vascular'
];

export const PATIENT_STATUSES: PatientStatus[] = [
  'Internado',
  'Observação',
  'Reavaliação',
  'Alta',
  'Transferência UPA',
  'Transferência Externa'
];

export const PENDENCIES: PendencyType[] = [
  'Nenhuma',
  'Sem prescrição médica',
  'Sem dieta',
  'Aguardando exames laboratoriais',
  'Aguardando Tomografia',
  'Aguardando Raio-X',
  'Aguardando Ultrassom',
  'Exames realizados, aguardando resultado',
  'Aguardando Assistente Social'
];

export const DIETS: DietType[] = [
  'Sem prescrição',
  'Suspensa',
  'Livre',
  'Pastosa',
  'Branda',
  'Líquida',
  'Laxativa',
  'DM',
  'HAS'
];
