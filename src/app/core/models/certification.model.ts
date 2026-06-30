import { EntityMetadata } from './api.model';

export interface Certification extends EntityMetadata {
  id: string;
  name: string;
  code: string;
  issuer: string;
  level: string;
  credlyLink: string;
  badgeLink: string;
  badgeType: 'auto' | 'upload' | 'default';
  accentColor: string;
  issueYear: string;
  expirationYear: string;
  displayOrder: number;
}
