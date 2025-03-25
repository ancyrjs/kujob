export interface Looper {
  configure(runnable: Runnable): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  clone(): Looper;
}

export type Runnable = () => Promise<void>;
