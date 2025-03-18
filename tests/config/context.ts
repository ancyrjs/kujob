declare module 'vitest' {
  export interface ProvidedContext {
    dbUser: string;
    dbPassword: string;
    dbHost: string;
    dbPort: number;
    dbDatabase: string;
  }
}
