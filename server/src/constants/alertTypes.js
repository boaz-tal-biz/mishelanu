export const ALERT_TYPES = {
  // Provider lifecycle
  new_registration:                  { tier: 'action_required',  title: 'New provider registration' },
  registration_expiring_48h:         { tier: 'action_required',  title: 'Registration expiring in 48 hours' },
  registration_expiring_12h:         { tier: 'action_required',  title: 'Registration expiring in 12 hours' },
  registration_expired:              { tier: 'informational',    title: 'Registration expired (restarts available)' },
  registration_restarted:            { tier: 'informational',    title: 'Registration restarted' },
  registration_permanently_expired:  { tier: 'action_required',  title: 'Registration permanently expired' },
  provider_ping:                     { tier: 'action_required',  title: 'Provider requesting approval' },
  enrichment_completed:              { tier: 'system_log',       title: 'LLM enrichment completed' },
  enrichment_failed:                 { tier: 'action_required',  title: 'LLM enrichment failed' },

  // Recommendations
  recommendation_received:           { tier: 'informational',    title: 'New recommendation received' },
  approval_ready:                    { tier: 'action_required',  title: 'Provider ready for approval' },
  hearsay_recommendation:            { tier: 'informational',    title: 'Hearsay recommendation flagged' },

  // Post-approval
  provider_live:                     { tier: 'informational',    title: 'Provider is now live' },
  low_recommendation_warning:        { tier: 'action_required',  title: 'Low recommendations after 30 days' },
  renewal_approaching:               { tier: 'action_required',  title: 'Provider renewal due in 30 days' },

  // Categories
  category_suggested:                { tier: 'action_required',  title: 'New category suggested' },
  alias_suggested:                   { tier: 'informational',    title: 'LLM alias suggestion for review' },

  // Inbound contact
  contact_message:                   { tier: 'action_required',  title: 'Contact form message received' },
  opt_in_provider:                   { tier: 'action_required',  title: 'Recommender interested in joining as provider' },
  opt_in_user:                       { tier: 'informational',    title: 'Recommender interested in joining as user' },

  // Monitor activity
  request_parsed:                    { tier: 'system_log',       title: 'Service request parsed' },
  match_sent:                        { tier: 'system_log',       title: 'Match sent to provider' },
  provider_accepted:                 { tier: 'informational',    title: 'Provider accepted match' },
  provider_declined:                 { tier: 'action_required',  title: 'Provider declined or timed out' },
  requester_notified:                { tier: 'system_log',       title: 'Requester notified with profile link' },

  // System
  admin_user_created:                { tier: 'system_log',       title: 'Admin user created' },
  admin_user_role_changed:           { tier: 'system_log',       title: 'Admin user role changed' },
  provider_suspended:                { tier: 'system_log',       title: 'Provider suspended by admin' },
  provider_reactivated:              { tier: 'system_log',       title: 'Provider reactivated by admin' },
  provider_deleted:                  { tier: 'system_log',       title: 'Provider deleted by admin' },
};
