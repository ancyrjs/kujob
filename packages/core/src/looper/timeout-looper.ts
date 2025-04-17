import { Looper, Runnable } from './looper.js';

export class TimeoutLooper implements Looper {
  private timeoutHandle: NodeJS.Timeout | null = null;
  private running = false;
  private runnable: Runnable | null = null;

  private timeoutDelay: number;

  constructor(props?: { timeoutDelay?: number }) {
    this.timeoutDelay = props?.timeoutDelay ?? 16;
  }

  configure(runnable: Runnable) {
    this.runnable = runnable;
  }

  clone(): Looper {
    return new TimeoutLooper({
      timeoutDelay: this.timeoutDelay,
    });
  }

  async start() {
    this.running = true;
    return this.doRun();
  }

  async stop() {
    this.running = false;

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private async doRun() {
    if (!this.runnable) {
      return;
    }

    if (!this.running) {
      return;
    }

    await this.runnable();
    if (this.running === true) {
      this.timeoutHandle = setTimeout(this.doRun.bind(this), this.timeoutDelay);
    }
  }
}
