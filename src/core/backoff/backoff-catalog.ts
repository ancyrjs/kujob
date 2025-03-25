import { BackoffStrategy } from './backoff-strategy.js';
import { AsapBackoff } from './asap-backoff.js';
import { FixedBackoff } from './fixed-backoff.js';

export interface BackoffConstructor<
  T extends BackoffStrategy = BackoffStrategy,
> {
  new (...args: any[]): T;
  deserializable: (obj: object) => boolean;
  deserialize: (obj: any) => T;
}

/**
 * Catalog of available backoff objects.
 * Backoffs can be added at run time by clients and will
 * automatically be handled by the system.
 */
export class BackoffCatalog {
  private static Options: BackoffConstructor[] = [AsapBackoff, FixedBackoff];

  /**
   * Register a new backoff object.
   * @param backoff
   */
  static register(backoff: BackoffConstructor) {
    if (!this.Options.includes(backoff)) {
      BackoffCatalog.register(backoff);
    }
  }

  /**
   * Match serialized data to a backoff object.
   * @param data
   */
  static findFromSerialized(data: object): BackoffConstructor | null {
    return this.Options.find((option) => option.deserializable(data)) ?? null;
  }
}
