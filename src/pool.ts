import pg from 'pg';

export class Pool {
  private pool: pg.Pool;

  constructor(config: { pool: pg.Pool }) {
    this.pool = config.pool;
  }

  connect() {
    return this.pool.connect();
  }

  end() {
    return this.pool.end();
  }

  raw() {
    return this.pool;
  }

  async runInTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
    const client = await this.pool.connect();

    let result: T;

    try {
      await client.query('BEGIN');
      result = await callback(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return result;
  }
}
