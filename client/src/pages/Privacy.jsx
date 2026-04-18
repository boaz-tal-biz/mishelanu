import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: April 2026. Draft for prototype — subject to legal review before production launch.</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>What Mishelanu Collects</h2>
        <p>Mishelanu collects the following categories of personal data:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: 1.8 }}>
          <li><strong>Provider registration data:</strong> first name, surname, email, phone number, area covered, business description, service categories, years in business, VAT number, Companies House registration, sole trader UTR, payment types, business size, and affiliations or credentials.</li>
          <li><strong>Recommender data:</strong> first name, surname, email, phone number, relationship to the provider, how long known, service description, and recommendation content.</li>
          <li><strong>Service request data:</strong> messages submitted through the monitor tool, including parsed service needs, location, urgency, and requester phone number.</li>
          <li><strong>Admin user data:</strong> email, name, and role for users who manage the Mishelanu platform.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>How Mishelanu Uses Your Data</h2>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li><strong>Profile enrichment:</strong> provider descriptions are processed by Anthropic's Claude API to generate structured, searchable profiles. This means your business description is sent to an external AI service for parsing.</li>
          <li><strong>Service request matching:</strong> community messages are parsed by Claude API to identify service needs and match them with registered providers.</li>
          <li><strong>Community vetting:</strong> recommender information is used by Mishelanu administrators to verify recommendations are genuine.</li>
          <li><strong>Admin review:</strong> all provider data, recommendations, and service requests are visible to Mishelanu administrators for quality control and matching purposes.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Recommender Data Scrub</h2>
        <p>Mishelanu is committed to minimising the personal data it retains from recommenders. When a provider is approved by an administrator, or when a provider's application expires permanently, the following recommender data is <strong>permanently and irreversibly deleted</strong>:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: 1.8 }}>
          <li>Recommender email address</li>
          <li>Recommender phone number</li>
          <li>Recommender surname</li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>After the scrub, only the recommender's first name, relationship type, and recommendation content are retained. This process is logged for audit purposes.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>LLM Processing</h2>
        <p>Provider descriptions and service request messages are sent to Anthropic's Claude API for automated parsing and enrichment. Anthropic's own data retention and privacy policies apply to this processing. Mishelanu does not control how Anthropic handles data once it has been sent for processing. You can review Anthropic's privacy practices at their website.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>What Mishelanu Does Not Do</h2>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li>Mishelanu does not sell your data to third parties.</li>
          <li>Mishelanu does not use your data for advertising.</li>
          <li>Mishelanu does not share your contact details with other providers or users, except as part of the matching process you have consented to by registering.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Cookies</h2>
        <p>Mishelanu uses minimal cookies. A session token is stored for authenticated admin users to maintain their login. This is a functional cookie required for the admin interface to operate. Mishelanu does not use tracking cookies, analytics cookies, or advertising cookies.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Data Requests</h2>
        <p>To request access to, correction of, or deletion of your personal data, contact: <a href="mailto:boaz@bless.network" style={{ color: 'var(--teal)' }}>boaz@bless.network</a></p>
      </section>

      <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem', marginTop: '2rem' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          See also: <Link to="/terms" style={{ color: 'var(--teal)' }}>Terms &amp; Conditions</Link> | <Link to="/disclaimer" style={{ color: 'var(--teal)' }}>Disclaimer</Link> | <Link to="/contact" style={{ color: 'var(--teal)' }}>Contact Us</Link>
        </p>
      </div>
    </div>
  );
}
