import { AcquiredJob, JobData } from '@kujob/core';
import { SpyProcessor } from './spy-processor.js';

export class FailingProcessor<T extends JobData = any> extends SpyProcessor<T> {
  static REASON = 'processor error';

  async process(job: AcquiredJob<T>): Promise<void> {
    await super.process(job);
    throw new Error(FailingProcessor.REASON);
  }
}
