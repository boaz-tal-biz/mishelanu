import { Link } from 'react-router-dom';

export default function Disclaimer() {
  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Disclaimer &amp; Limitation of Liability</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: April 2026. Draft for prototype — subject to legal review before production launch.</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Service Provided "As Is"</h2>
        <p>Mishelanu is provided on an "as is" and "as available" basis. Mishelanu makes no warranties, express or implied, regarding the quality, reliability, availability, or fitness for any particular purpose of the service or any providers listed on it.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Introductions Only</h2>
        <p>Mishelanu facilitates introductions between community members seeking services and providers who have been recommended by the community. Mishelanu is not responsible for the outcome, quality, timeliness, or safety of any work or service carried out by a provider found through this platform.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Mishelanu and its operators are not liable for any direct, indirect, incidental, consequential, or special damages arising from:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: 1.8 }}>
          <li>The use of services provided by any provider listed on Mishelanu</li>
          <li>Any loss, damage, or injury resulting from engaging a provider found through this platform</li>
          <li>Any inaccuracy in provider profiles, recommendations, or service descriptions</li>
          <li>Any interruption, error, or unavailability of the Mishelanu service</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Community Recommendations</h2>
        <p>Recommendations displayed on Mishelanu are personal opinions submitted by community members. They are not professional endorsements, certifications, or guarantees of any kind. Mishelanu does not verify the accuracy or authenticity of recommendation content beyond basic fraud prevention measures.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Regulatory Standing</h2>
        <p>Mishelanu is not a regulatory body, trade association, or professional accreditation service. Listing on Mishelanu does not replace any statutory requirements for trades, professional services, or regulated activities. Users should independently verify that providers hold appropriate credentials, insurance, and qualifications for the work they are being engaged to perform.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Your Responsibility</h2>
        <p>Users are responsible for conducting their own due diligence before engaging any provider. This includes verifying qualifications, insurance, references, and any other information relevant to the service being sought. Mishelanu encourages all users to exercise the same care they would when engaging any service provider.</p>
      </section>

      <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem', marginTop: '2rem' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          See also: <Link to="/privacy" style={{ color: 'var(--teal)' }}>Privacy Policy</Link> | <Link to="/terms" style={{ color: 'var(--teal)' }}>Terms &amp; Conditions</Link> | <Link to="/contact" style={{ color: 'var(--teal)' }}>Contact Us</Link>
        </p>
      </div>
    </div>
  );
}
