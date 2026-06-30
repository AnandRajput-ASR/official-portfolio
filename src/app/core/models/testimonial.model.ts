import { EntityMetadata } from './api.model';

export interface Testimonial extends EntityMetadata {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  visible: boolean;
  displayOrder: number;
  status: 'approved' | 'pending' | 'rejected';
  status_v2?: Testimonial['status'];
  submittedAt?: string;
}
