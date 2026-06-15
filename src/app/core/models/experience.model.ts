import { EntityMetadata } from './api.model';

export interface Experience extends EntityMetadata {
  id: string;
  period: string;
  role: string;
  company: string;
  location: string;
  description: string;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  start_date_d?: string;
  end_date_d?: string;
}
