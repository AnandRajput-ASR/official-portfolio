export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface EntityMetadata {
  version?: number;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  singleton_key?: string;
}
