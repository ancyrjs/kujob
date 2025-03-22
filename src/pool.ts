import pg from 'pg';

export class Pool {
  private pool: pg.Pool;

  constructor(config: { pool: pg.Pool }) {
    this.pool = config.pool;
  }

  /**
   * Invokes the callback within a transaction
   * @param callback
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
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
