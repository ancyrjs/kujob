import { Looper, Runnable } from './looper.js';

/**
 * Does nothing by default.
 * Allow the clients to trigger the runnable manually.
 */
export class StepLooper implements Looper {
  private runnable: Runnable | null = null;

  configure(runnable: Runnable) {
    this.runnable = runnable;
  }

  clone(): Looper {
    return new StepLooper();
  }

  async start() {}

  async stop() {}

  async forward() {
    if (!this.runnable) {
      return;
    }

    await this.runnable();
  }
}
