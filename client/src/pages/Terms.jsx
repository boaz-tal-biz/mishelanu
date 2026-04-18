import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Terms &amp; Conditions</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: April 2026. Draft for prototype — subject to legal review before production launch.</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>About Mishelanu</h2>
        <p>Mishelanu is a community matching service that connects people looking for services with providers who have been recommended by members of the community. Mishelanu operates in the United Kingdom and is intended for UK-based communities.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Community-Based Vetting</h2>
        <p>Provider vetting on Mishelanu is entirely community-based, through personal recommendations. Mishelanu does not independently verify provider credentials, qualifications, insurance, or any other professional requirement. The presence of a provider on Mishelanu is not a guarantee of quality, reliability, competence, or fitness for any purpose.</p>
        <p style={{ marginTop: '0.5rem' }}>Community recommendations are personal opinions offered by individuals. They are not professional endorsements, certifications, or warranties.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Provider Registration</h2>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li>Providers must provide accurate and truthful information when registering. Submitting false or misleading information is grounds for immediate removal.</li>
          <li>Providers have 72 hours from registration to collect 3 community recommendations. If the deadline passes, the provider may restart the clock up to 2 times without re-entering their details. After 2 failed restarts, the application expires permanently and the provider must re-register from scratch.</li>
          <li>A provider goes live on Mishelanu only when all three conditions are met: LLM profile enrichment is complete, at least 3 recommendations have been received, and an administrator has approved the profile. Administrators may approve with fewer than 3 recommendations at their discretion.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Recommendations</h2>
        <p>Recommendations submitted to Mishelanu must be genuine. Fraudulent or fabricated recommendations are grounds for removal of both the recommender's details and the associated provider's profile. Mishelanu reserves the right to reject or remove any recommendation at its discretion.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Engaging Providers</h2>
        <p>Users who connect with providers through Mishelanu do so at their own risk. Mishelanu is not a party to any agreement, arrangement, or transaction between a user and a provider. Mishelanu does not mediate disputes, provide refunds, or guarantee the outcome of any engagement.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Administration</h2>
        <p>Mishelanu administrators reserve the right to remove, suspend, or modify any provider profile at any time, for any reason, without prior notice. This includes profiles that receive complaints, appear fraudulent, or violate these terms.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Pricing</h2>
        <p>The Mishelanu service is currently free for providers and users. Pricing for provider renewals may be introduced in the future. Providers will be notified in advance of any pricing changes.</p>
      </section>

      <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem', marginTop: '2rem' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          See also: <Link to="/privacy" style={{ color: 'var(--teal)' }}>Privacy Policy</Link> | <Link to="/disclaimer" style={{ color: 'var(--teal)' }}>Disclaimer</Link> | <Link to="/contact" style={{ color: 'var(--teal)' }}>Contact Us</Link>
        </p>
      </div>
    </div>
  );
}
