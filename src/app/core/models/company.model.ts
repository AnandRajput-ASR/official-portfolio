import { EntityMetadata } from './api.model';

export type ProjectStatus = 'completed' | 'in-progress' | 'planned' | 'archived' | null;

export interface CompanyProject extends EntityMetadata {
  id: string;
  number: string;
  title: string;
  description: string;
  tech: string[];
  link: string;
  displayOrder: number;
  status?: ProjectStatus;
  status_v2?: ProjectStatus;
  impact?: string;
}

export interface Company extends EntityMetadata {
  id: string;
  name: string;
  role: string;
  period: string;
  location: string;
  logo: string;
  accentColor: string;
  current: boolean;
  description: string;
  projects: CompanyProject[];
  displayOrder: number;
  achievements?: string[];
  website?: string;
  teamSize?: string;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  start_date_d?: string;
  end_date_d?: string;
}
