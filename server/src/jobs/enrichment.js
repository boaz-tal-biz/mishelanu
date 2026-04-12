import pool from '../db/pool.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function runEnrichment() {
  const { rows: providers } = await pool.query(
    `SELECT id, full_name, business_name, service_categories, raw_description, raw_external_links
     FROM providers WHERE enrichment_status = 'pending' LIMIT 5`
  );

  for (const provider of providers) {
    try {
      console.log(`Enriching provider: ${provider.full_name} (${provider.id})`);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are enriching a service provider profile for a community trust network. Given the raw registration data below, produce two outputs.

Provider name: ${provider.full_name}
Business name: ${provider.business_name || 'N/A'}
Categories selected: ${(provider.service_categories || []).join(', ')}
Description: ${provider.raw_description || 'None provided'}
External links: ${provider.raw_external_links || 'None provided'}

Output a JSON object with two keys:
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

2. "profile_html" — clean, well-formatted HTML for their public profile page. Use <h3>, <p>, <ul> tags. Be concise and professional. Include their name, services, experience, and any notable details. Do not include contact information. Style it for a community directory.

3. "suggested_categories" — if the description suggests service categories beyond what they selected, list them as an array of "Category: Subcategory" strings. Otherwise null.

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

      params.push(provider.id);
      await pool.query(
        `UPDATE providers SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );

      // Create category suggestion alert if applicable
      if (result.suggested_categories?.length > 0) {
        await pool.query(
          `INSERT INTO admin_alerts (provider_id, alert_type, alert_message, metadata)
           VALUES ($1, 'category_suggestion', $2, $3)`,
          [
            provider.id,
            `LLM suggests additional categories for ${provider.full_name}: ${result.suggested_categories.join(', ')}`,
            JSON.stringify({ suggested: result.suggested_categories, provider_id: provider.id })
          ]
        );
      }

      console.log(`Enriched provider: ${provider.full_name}`);
    } catch (err) {
      console.error(`Enrichment failed for ${provider.id}:`, err.message);
    }
  }
}
