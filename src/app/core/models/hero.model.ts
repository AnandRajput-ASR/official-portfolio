import { EntityMetadata } from './api.model';

export interface Hero extends EntityMetadata {
  name: string;
  title: string;
  subtitle: string;
  bio: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  availableForWork: boolean;
}
