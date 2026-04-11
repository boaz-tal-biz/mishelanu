import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname.replace(/^\//, '') });
dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname.replace(/^\//, '') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
