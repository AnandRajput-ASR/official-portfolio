import { EntityMetadata } from './api.model';

export interface Skill extends EntityMetadata {
  id: string;
  name: string;
  icon: string;
  accentColor: string;
  description: string;
  tags: string[];
  proficiency: number;
  yearsExp: string;
  displayOrder: number;
}
