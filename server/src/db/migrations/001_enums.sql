CREATE TYPE provider_status AS ENUM ('active', 'suspended', 'awaiting_payment', 'deleted');
CREATE TYPE enrichment_status AS ENUM ('pending', 'processed', 'reviewed');
CREATE TYPE recommendation_relationship AS ENUM ('Client', 'Colleague', 'Friend/Family', 'Community member');
CREATE TYPE service_request_status AS ENUM ('new', 'parsed', 'sent', 'provider_interested', 'provider_declined', 'requester_notified', 'profile_viewed', 'closed');
CREATE TYPE message_type AS ENUM ('provider_opportunity', 'requester_match', 'provider_followup', 'provider_visit_notification', 'renewal_reminder');
CREATE TYPE alert_type AS ENUM ('missing_recommendations', 'renewal_due', 'new_registration', 'category_suggestion');
CREATE TYPE category_status AS ENUM ('active', 'pending_approval');
