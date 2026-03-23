export type DoctorCategory = 'system' | 'config' | 'tools' | 'mcp';

export interface DoctorResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  detail?: string;
}

export interface DoctorCheck {
  name: string;
  category: DoctorCategory;
  run: () => Promise<DoctorResult>;
}
