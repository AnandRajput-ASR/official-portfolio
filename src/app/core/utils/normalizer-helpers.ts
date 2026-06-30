export type Dict = Record<string, unknown>;

export function isDict(value: unknown): value is Dict {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asDict(value: unknown): Dict {
  return isDict(value) ? value : {};
}

export function unwrapData(value: unknown): unknown {
  const record = asDict(value);
  return record['data'] ?? value;
}

export function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

export function notDeleted<T>(item: T): boolean {
  return asDict(item)['is_deleted'] !== true;
}
