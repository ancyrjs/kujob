export class Duration {
  static IMMEDIATE = new Duration(0);

  private readonly ms: number;

  constructor(ms: number) {
    this.ms = ms;
  }

  static milliseconds(milliseconds: number): Duration {
    return new Duration(milliseconds);
  }

  static seconds(seconds: number): Duration {
    return new Duration(seconds * 1_000);
  }

  static minutes(minutes: number): Duration {
    return new Duration(minutes * 60_000);
  }

  static hours(hours: number): Duration {
    return new Duration(hours * 3_600_000);
  }

  static days(days: number): Duration {
    return new Duration(days * 86_400_000);
  }

  toMilliseconds(): number {
    return this.ms;
  }

  addToDate(date: Date): Date {
    return new Date(date.getTime() + this.ms);
  }
}
