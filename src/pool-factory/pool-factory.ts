import pg from 'pg';

export interface PoolFactory {
  createPool(): pg.Pool;
}

type ConnectionSettings = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
};

export class DefaultPoolFactory implements PoolFactory {
  private connection: ConnectionSettings;

  constructor(connection: ConnectionSettings) {
    this.connection = connection;
  }

  createPool() {
    return new pg.Pool(this.connection);
  }
}
