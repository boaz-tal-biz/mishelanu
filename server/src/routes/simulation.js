import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// Simulated WhatsApp group chat messages
const groupMessages = [
  { sender: 'Sarah Cohen', phone: '+447700100001', time: '09:12', text: 'Good morning everyone! Has anyone tried that new bakery on Golders Green Road?' },
  { sender: 'David Levy', phone: '+447700100002', time: '09:15', text: 'Yes! The challah is amazing. Highly recommend.' },
  { sender: 'Rachel Green', phone: '+447700100003', time: '09:23', text: 'Does anyone know a good plumber in Hendon? We have a leak and it\'s getting worse' },
  { sender: 'Moshe Katz', phone: '+447700100004', time: '09:25', text: 'Shabbat times this week: candle lighting 7:42pm' },
  { sender: 'Yael Ben-David', phone: '+447700100005', time: '09:31', text: 'Looking for an accountant who understands Israeli tax treaties — moving back and forth' },
  { sender: 'Jonathan Silver', phone: '+447700100006', time: '09:34', text: 'Has anyone been to the Hendon Hub exhibition?' },
  { sender: 'Miriam Shapiro', phone: '+447700100007', time: '09:38', text: 'Need an electrician urgently in Golders Green, kitchen light fitting fell off the ceiling 😱' },
  { sender: 'Avi Goldstein', phone: '+447700100008', time: '09:41', text: 'Anyone selling a double buggy? Ours just broke' },
  { sender: 'Talia Rosen', phone: '+447700100009', time: '09:45', text: 'Can anyone recommend a solicitor for property purchase in Barnet?' },
  { sender: 'Danny Friedman', phone: '+447700100010', time: '09:48', text: 'Great shiur at the shul last night, really enjoyed it' },
  { sender: 'Noa Peretz', phone: '+447700100011', time: '09:52', text: 'מישהו מכיר רופא שיניים טוב באזור פינצ\'לי?' },
  { sender: 'Michael Stern', phone: '+447700100012', time: '09:55', text: 'Reminder: community Purim event next Sunday at 3pm!' },
  { sender: 'Leah Abramowitz', phone: '+447700100013', time: '10:01', text: 'Looking for a Hebrew teacher for my 8-year-old, preferably in Edgware area' },
  { sender: 'Eitan Cohen', phone: '+447700100014', time: '10:05', text: 'Anyone know if the kosher deli on Brent Street is open on Sundays?' },
  { sender: 'Shira Mendel', phone: '+447700100015', time: '10:09', text: 'We need a reliable handyman for some odd jobs around the house in Mill Hill. Shelves, a door that won\'t close properly, that sort of thing.' },
  { sender: 'Oren Levi', phone: '+447700100016', time: '10:12', text: 'Just moved to Stanmore — any recommendations for a GP that takes new NHS patients?' },
  { sender: 'Ruth Berkowitz', phone: '+447700100017', time: '10:18', text: 'The park on Sunny Hill is looking beautiful right now. Worth a walk!' },
  { sender: 'Yoni Dahan', phone: '+447700100018', time: '10:22', text: 'Does anyone have a good IT person? My laptop keeps crashing and I work from home' },
];

// Get simulated group chat messages
router.get('/group/messages', (req, res) => {
  res.json(groupMessages);
});

// Get messages for a provider's simulated inbox
router.get('/provider/:phone/messages', async (req, res, next) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { rows } = await pool.query(
      `SELECT om.*, sr.raw_message AS original_request
       FROM outbound_messages om
       LEFT JOIN service_requests sr ON om.service_request_id = sr.id
       WHERE om.recipient_phone = $1
       ORDER BY om.sent_at DESC`,
      [phone]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Clear messages for a provider's simulated inbox
router.delete('/provider/:phone/messages', async (req, res, next) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    await pool.query(`DELETE FROM outbound_messages WHERE recipient_phone = $1`, [phone]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Get messages for a requester's simulated inbox
router.get('/requester/:phone/messages', async (req, res, next) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { rows } = await pool.query(
      `SELECT om.*
       FROM outbound_messages om
       JOIN service_requests sr ON om.service_request_id = sr.id
       WHERE sr.requester_phone = $1 AND om.message_type = 'requester_match'
       ORDER BY om.sent_at DESC`,
      [phone]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Clear messages for a requester's simulated inbox
router.delete('/requester/:phone/messages', async (req, res, next) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    await pool.query(
      `DELETE FROM outbound_messages WHERE id IN (
        SELECT om.id FROM outbound_messages om
        JOIN service_requests sr ON om.service_request_id = sr.id
        WHERE sr.requester_phone = $1 AND om.message_type = 'requester_match'
      )`, [phone]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Provider responds YES to a match
router.post('/provider/respond', async (req, res, next) => {
  try {
    const { request_id, response } = req.body;
    if (!request_id || !response) {
      return res.status(400).json({ error: 'request_id and response (YES/NO) required' });
    }

    const { rows: reqRows } = await pool.query(
      `SELECT sr.*, p.slug AS provider_slug, p.whatsapp_number AS provider_phone
       FROM service_requests sr
       JOIN providers p ON sr.matched_provider_id = p.id
       WHERE sr.id = $1`,
      [request_id]
    );
    if (reqRows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = reqRows[0];

    if (response.toUpperCase() === 'YES') {
      // Update request status
      await pool.query(
        `UPDATE service_requests SET status = 'provider_interested', updated_at = NOW() WHERE id = $1`,
        [request_id]
      );

      // Send message to requester with profile link
      const profileUrl = `/provider/${request.provider_slug}?ref=${request_id}`;
      await pool.query(
        `INSERT INTO outbound_messages (service_request_id, provider_id, recipient_phone, message_type, message_body)
         VALUES ($1, $2, $3, 'requester_match', $4)`,
        [request_id, request.matched_provider_id, request.requester_phone,
         `Mazel tov! Mishelanu found a trusted community provider for you. Check out their profile: ${profileUrl}`]
      );

      // Send confirmation to provider
      await pool.query(
        `INSERT INTO outbound_messages (service_request_id, provider_id, recipient_phone, message_type, message_body)
         VALUES ($1, $2, $3, 'provider_followup',
           'Yofi! Mishelanu has shared your details with the requester. They may contact you directly. B''hatzlacha!')`,
        [request_id, request.matched_provider_id, request.provider_phone]
      );

      // Update status to requester_notified
      await pool.query(
        `UPDATE service_requests SET status = 'requester_notified', updated_at = NOW() WHERE id = $1`,
        [request_id]
      );

      res.json({ ok: true, status: 'requester_notified' });
    } else {
      // Provider declined
      await pool.query(
        `UPDATE service_requests SET status = 'provider_declined', matched_provider_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [request_id]
      );

      res.json({ ok: true, status: 'provider_declined' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
