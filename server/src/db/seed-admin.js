import bcrypt from 'bcryptjs';
import pool from './pool.js';

export async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const { rows } = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (rows.length > 0) {
    console.log('Super admin already exists — skipping seed');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const surname = process.env.SUPER_ADMIN_SURNAME || 'Admin';

  await pool.query(
    `INSERT INTO admin_users (email, password_hash, first_name, surname, role)
     VALUES ($1, $2, $3, $4, 'super_admin')`,
    [email, hash, firstName, surname]
  );
  console.log(`Super admin seeded: ${email}`);
}
