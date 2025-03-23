import { Processor } from '../../src/core/processor.js';
import { Job } from '../../src/core/job.js';

export class FailingProcessor implements Processor {
  static REASON = 'processor error';

  async process(job: Job<any>): Promise<void> {
    throw new Error(FailingProcessor.REASON);
  }

  getConcurrency(): number {
    return 1;
  }
}
