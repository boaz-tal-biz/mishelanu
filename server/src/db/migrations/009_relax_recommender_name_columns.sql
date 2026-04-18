-- Make recommender name columns nullable so scrubRecommenderDetails can clear
-- them per the design (recommender_email = null, recommender_phone = null,
-- recommender_surname = null). The API still enforces NOT NULL on new
-- submissions; the DB stays permissive for legacy + post-scrub rows.

ALTER TABLE recommendations
  ALTER COLUMN recommender_name    DROP NOT NULL,
  ALTER COLUMN recommender_surname DROP NOT NULL;
