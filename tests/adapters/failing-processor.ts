import { BaseJobData, Job } from '../../src/core/job.js';
import { SpyProcessor } from './spy-processor.js';

export class FailingProcessor<
  T extends BaseJobData = any,
> extends SpyProcessor<T> {
  static REASON = 'processor error';

  async process(job: Job<T>): Promise<void> {
    await super.process(job);
    throw new Error(FailingProcessor.REASON);
  }
}
