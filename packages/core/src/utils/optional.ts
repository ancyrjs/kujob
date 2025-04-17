export class Optional<T> {
  static some<T>(value: T): Optional<T> {
    return new Optional(value);
  }

  static none<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  private constructor(private value: T | null | undefined) {}

  getOrThrow(message = 'No value present'): T {
    if (this.value === null || this.value === undefined) {
      throw new Error(message);
    }

    return this.value;
  }
}
