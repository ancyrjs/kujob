import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';

export class Pool {
  private pool: PgPool;

  constructor(config: { pool: PgPool }) {
    this.pool = config.pool;
  }

  /**
   * Invokes the callback within a transaction
   * @param callback
   */
  async transaction<T>(callback: (client: PgPoolClient) => Promise<T>) {
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

  async query<T>(callback: (client: PgPoolClient) => Promise<T>) {
    const client = await this.pool.connect();

    let result: T;

    try {
      result = await callback(client);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }

    return result;
  }
}
