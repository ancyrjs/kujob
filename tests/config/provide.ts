import './context.js';
import { inject, ProvidedContext } from 'vitest';

export const provide = <T extends keyof ProvidedContext>(name: T) =>
  inject(name);
