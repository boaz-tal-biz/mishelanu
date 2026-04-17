import pool from '../db/pool.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function runEnrichment() {
  const { rows: providers } = await pool.query(
    `SELECT id, first_name, surname, business_name, service_categories,
            raw_description, raw_external_links, affiliations,
            area_covered, years_in_business,
            payment_types, payment_types_other,
            business_size, business_size_other
     FROM providers WHERE enrichment_status = 'pending' LIMIT 5`
  );

  for (const provider of providers) {
    const providerName = `${provider.first_name} ${provider.surname}`;
    try {
      console.log(`Enriching provider: ${providerName} (${provider.id})`);

      // Load current active canonical categories so the model can suggest aliases against them
      const { rows: activeCats } = await pool.query(
        `SELECT subcategory FROM service_categories_registry WHERE status = 'active' ORDER BY subcategory`
      );
      const catList = activeCats.map(c => c.subcategory).join(', ');

      const paymentTypesDisplay = (() => {
        if (!provider.payment_types || provider.payment_types.length === 0) return 'Not specified';
        const labels = {
          cash: 'cash',
          card: 'card',
          bank_transfer: 'bank transfer',
          other: provider.payment_types_other ? `other (${provider.payment_types_other})` : 'other'
        };
        return provider.payment_types.map(t => labels[t] || t).join(', ');
      })();
      const businessSizeDisplay = provider.business_size === 'other' && provider.business_size_other
        ? `other (${provider.business_size_other})`
        : (provider.business_size || 'Not specified');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are enriching a service provider profile for a community trust network. Given the raw registration data below, produce four outputs.

Provider name: ${providerName}
Business name: ${provider.business_name || 'N/A'}
Area covered: ${provider.area_covered || 'Not specified'}
Years in business: ${provider.years_in_business ?? 'Not specified'}
Business size: ${businessSizeDisplay}
Accepted payment types: ${paymentTypesDisplay}
Categories selected: ${(provider.service_categories || []).join(', ')}
Description: ${provider.raw_description || 'None provided'}
External links: ${provider.raw_external_links || 'None provided'}
Affiliations and credentials: ${provider.affiliations || 'None provided'}

Active canonical categories in the system:
${catList}

Output a JSON object with these keys:
1. "parsed_profile" — structured data extracted from the description:
   {
     "experience": "years/description of experience",
     "specialisations": "specific areas of expertise",
     "qualifications": "any certifications, qualifications mentioned",
     "service_areas": "geographic areas served",
     "pricing_model": "if mentioned (hourly, fixed, free quotes, etc.)",
     "languages": "languages mentioned or implied"
   }
   Use null for any field you cannot determine.

2. "profile_html" — clean, well-formatted HTML for their public profile page. Use <h3>, <p>, <ul> tags. Be concise and professional. Include their name, services, experience, area covered, years in business, business size, accepted payment types, affiliations, and any notable details. Do not include contact information. Style it for a community directory.

3. "suggested_categories" — if the description suggests service categories beyond what they selected, list them as an array of "Category: Subcategory" strings. Otherwise null.

4. "suggested_aliases" — if any terms in the provider's selected or described categories are synonyms of an active canonical category, suggest them as alias mappings. Array of objects like { "alias": "leak fixer", "target_subcategory": "Plumber" }. Only map to subcategories that appear in the active canonical list above. Use an empty array if no new aliases are useful.

Reply ONLY with valid JSON, no markdown fences.`
        }]
      });

      const text = message.content[0].text;
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.error(`Failed to parse LLM response for ${provider.id}`);
        continue;
      }

      const updates = [
        `parsed_profile = $1::jsonb`,
        `profile_html = $2`,
        `enrichment_status = 'processed'`,
        `updated_at = NOW()`
      ];
      const params = [
        JSON.stringify(result.parsed_profile || {}),
        result.profile_html || null,
      ];

      if (result.suggested_categories) {
        updates.push(`parsed_categories_suggestion = $${params.length + 1}`);
        params.push(result.suggested_categories);
      }

      if (result.suggested_aliases) {
        updates.push(`parsed_alias_suggestions = $${params.length + 1}::jsonb`);
        params.push(JSON.stringify(result.suggested_aliases));
      }

      params.push(provider.id);
      await pool.query(
        `UPDATE providers SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );

      if (result.suggested_categories?.length > 0) {
        await pool.query(
          `INSERT INTO admin_alerts (provider_id, alert_type, alert_message, metadata)
           VALUES ($1, 'category_suggestion', $2, $3)`,
          [
            provider.id,
            `LLM suggests additional categories for ${providerName}: ${result.suggested_categories.join(', ')}`,
            JSON.stringify({ suggested: result.suggested_categories, provider_id: provider.id })
          ]
        );
      }

      // Go-live check: enrichment now processed + admin_approved.
      // admin_approved IS the override flag — once admin has approved (whether
      // after 3 recs or as an explicit override with fewer), the rec_count gate
      // no longer applies. The admin approve route only sets live_at when
      // enrichment was already processed, so this branch handles the case where
      // admin approved BEFORE enrichment finished.
      const { rows: goLiveRows } = await pool.query(
        `SELECT admin_approved, live_at FROM providers WHERE id = $1`,
        [provider.id]
      );
      const g = goLiveRows[0];
      if (!g.live_at && g.admin_approved) {
        await pool.query(
          `UPDATE providers SET live_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND live_at IS NULL`,
          [provider.id]
        );
        console.log(`Provider ${providerName} is now live`);
      }

      console.log(`Enriched provider: ${providerName}`);
    } catch (err) {
      console.error(`Enrichment failed for ${provider.id}:`, err.message);
    }
  }
}
