export const isObj = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;
