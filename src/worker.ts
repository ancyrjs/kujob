import { ReadOnlyJob } from './job.js';

export interface Worker<T extends Record<string, any> = Record<string, any>> {
  process(job: ReadOnlyJob<T>): Promise<any>;
}
