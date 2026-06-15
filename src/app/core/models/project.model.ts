import { EntityMetadata } from './api.model';

export interface PersonalProject extends EntityMetadata {
  id: string;
  title: string;
  description: string;
  tech: string[];
  githubUrl: string;
  liveUrl: string;
  status: 'live' | 'wip' | 'archived';
  type: 'personal' | 'freelance' | 'opensource';
  status_v2?: PersonalProject['status'];
  type_v2?: PersonalProject['type'];
  featured: boolean;
  year: string;
  displayOrder: number;
}
