import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../db/pool.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const anthropic = new Anthropic();

// Parse a raw WhatsApp message using Claude
router.post('/parse', requireAuth, async (req, res, next) => {
  try {
    const { raw_message } = req.body;
    if (!raw_message) return res.status(400).json({ error: 'raw_message is required' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract the following from this community WhatsApp message requesting a service. Reply ONLY with valid JSON, no markdown.

Message: "${raw_message}"

Extract:
{
  "requester_phone": "phone number if visible, or null",
  "service_needed": "what service they need",
  "location": "location mentioned, or null",
  "urgency": "urgent/normal/not specified",
  "context": "any other relevant details (budget, language preference, timeline)"
}`
      }]
    });

    const text = message.content[0].text;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw_response: text, parse_error: true };
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

// Create a service request from parsed data
router.post('/request', requireAuth, async (req, res, next) => {
  try {
    const { raw_message, requester_phone, parsed_service_needed, parsed_location, parsed_urgency, parsed_context } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO service_requests (raw_message, requester_phone, parsed_service_needed, parsed_location, parsed_urgency, parsed_context, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'parsed') RETURNING *`,
      [raw_message, requester_phone || null, parsed_service_needed, parsed_location || null, parsed_urgency || null, parsed_context || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Search providers for matching
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query (q) required' });

    // Split query into meaningful keywords (3+ chars) for flexible matching
    const keywords = q.split(/\s+/).filter(w => w.length >= 3);
    if (keywords.length === 0) keywords.push(q.trim());

    // Build OR conditions for each keyword across all searchable fields
    const conditions = [];
    const params = [];
    for (const keyword of keywords) {
      const i = params.length + 1;
      params.push(`%${keyword}%`);
      conditions.push(`(
        p.first_name ILIKE $${i}
        OR p.surname ILIKE $${i}
        OR p.business_name ILIKE $${i}
        OR p.raw_description ILIKE $${i}
        OR p.address ILIKE $${i}
        OR p.area_covered ILIKE $${i}
        OR EXISTS (SELECT 1 FROM unnest(p.service_categories) AS cat WHERE cat ILIKE $${i})
      )`);
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.slug,
              (p.first_name || ' ' || p.surname) AS full_name,
              p.first_name, p.surname,
              p.business_name, p.service_categories,
              p.address, p.area_covered, p.mobile_phone, p.whatsapp_number,
              (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count
       FROM providers p
       WHERE p.status = 'active' AND p.live_at IS NOT NULL
         AND (${conditions.join(' OR ')})
       ORDER BY
         (SELECT COUNT(*) FROM recommendations WHERE provider_id = p.id) DESC,
         p.first_name, p.surname
       LIMIT 20`,
      params
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Send match: assign a provider to a service request
router.post('/match', requireAuth, async (req, res, next) => {
  try {
    const { request_id, provider_id } = req.body;
    if (!request_id || !provider_id) {
      return res.status(400).json({ error: 'request_id and provider_id required' });
    }

    // Get request and provider
    const { rows: reqRows } = await pool.query(`SELECT * FROM service_requests WHERE id = $1`, [request_id]);
    if (reqRows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = reqRows[0];

    const { rows: provRows } = await pool.query(`SELECT * FROM providers WHERE id = $1`, [provider_id]);
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = provRows[0];

    // Update request
    await pool.query(
      `UPDATE service_requests SET matched_provider_id = $1, status = 'sent', updated_at = NOW()
       WHERE id = $2`,
      [provider_id, request_id]
    );

    // Build and store outbound message to provider
    const messageBody = `Shalom! Mishelanu has a request from the community:

Someone is looking for: ${request.parsed_service_needed || 'a service provider'}
${request.parsed_location ? `Area: ${request.parsed_location}` : ''}
${request.parsed_urgency && request.parsed_urgency !== 'not specified' ? `Urgency: ${request.parsed_urgency}` : ''}
${request.parsed_context ? `Details: ${request.parsed_context}` : ''}

Interested? Reply YES and Mishelanu will connect you. Otherwise reply NO — no hard feelings!`;

    await pool.query(
      `INSERT INTO outbound_messages (service_request_id, provider_id, recipient_phone, message_type, message_body)
       VALUES ($1, $2, $3, 'provider_opportunity', $4)`,
      [request_id, provider_id, provider.whatsapp_number, messageBody]
    );

    res.json({ ok: true, message: 'Match sent to provider' });
  } catch (err) {
    next(err);
  }
});

export default router;
