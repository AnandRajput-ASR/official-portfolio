import { EntityMetadata } from './api.model';

export interface Stat extends EntityMetadata {
  id: string;
  value: number;
  suffix: string;
  label: string;
}
