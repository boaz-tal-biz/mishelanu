import pool from '../db/pool.js';

function extractInput(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('other:')) {
    return trimmed.slice(6).trim().toLowerCase();
  }
  if (trimmed.includes(':')) {
    return trimmed.split(':').slice(1).join(':').trim().toLowerCase();
  }
  return trimmed.toLowerCase();
}

export async function resolveCategory(inputText, client = pool) {
  const key = extractInput(inputText);
  if (!key) return null;

  const aliasRes = await client.query(
    `SELECT a.category_id, r.status
     FROM category_aliases a
     JOIN service_categories_registry r ON r.id = a.category_id
     WHERE a.alias = $1`,
    [key]
  );

  if (aliasRes.rows.length > 0) {
    const { category_id, status } = aliasRes.rows[0];
    if (status === 'active') return category_id;
  }

  const existing = await client.query(
    `SELECT id, status FROM service_categories_registry
     WHERE lower(subcategory) = $1
     LIMIT 1`,
    [key]
  );
  if (existing.rows.length > 0 && existing.rows[0].status === 'active') {
    return existing.rows[0].id;
  }

  const insertRes = await client.query(
    `INSERT INTO service_categories_registry (category, subcategory, status)
     VALUES ('Suggested', $1, 'suggested')
     RETURNING id`,
    [key]
  );
  const newId = insertRes.rows[0].id;

  await client.query(
    `INSERT INTO category_aliases (alias, category_id)
     VALUES ($1, $2)
     ON CONFLICT (alias) DO NOTHING`,
    [key, newId]
  );

  return newId;
}

export async function resolveCategories(inputs, client = pool) {
  const ids = [];
  for (const raw of inputs || []) {
    const id = await resolveCategory(raw, client);
    if (id) ids.push(id);
  }
  return ids;
}
