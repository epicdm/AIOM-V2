-- ============================================================================
-- pg_cron Setup for AI COO Monitoring
-- ============================================================================
-- This file contains SQL commands to set up pg_cron extension and create
-- scheduled jobs for the AI COO monitoring system.
--
-- IMPORTANT: This must be run by a superuser or database owner
-- ============================================================================

-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to your application user (replace 'your_app_user' with actual username)
-- GRANT USAGE ON SCHEMA cron TO your_app_user;

-- ============================================================================
-- Scheduled Job: Financial Health Check (Every Hour)
-- ============================================================================
-- This job calls a PostgreSQL function that triggers the financial analysis
-- The actual analysis is performed by the Node.js application

-- Create a function that the cron job will call
CREATE OR REPLACE FUNCTION trigger_financial_analysis()
RETURNS void AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Find the financial monitoring job
  SELECT * INTO job_record 
  FROM monitoring_jobs 
  WHERE analyzer_type = 'financial' 
    AND enabled = true 
  LIMIT 1;
  
  IF job_record IS NOT NULL THEN
    -- Update last run time
    UPDATE monitoring_jobs 
    SET last_run_at = NOW(),
        next_run_at = NOW() + INTERVAL '1 hour'
    WHERE id = job_record.id;
    
    -- Insert a notification record that the app will pick up
    -- The app polls for these notifications and executes the analysis
    INSERT INTO pg_temp.ai_coo_triggers (job_id, triggered_at)
    VALUES (job_record.id, NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule the job to run every hour
-- Returns job ID which you can use to manage the job
SELECT cron.schedule(
  'ai-coo-financial-hourly',           -- Job name
  '0 * * * *',                          -- Cron expression (every hour at minute 0)
  $$SELECT trigger_financial_analysis()$$
);

-- ============================================================================
-- Alternative: Direct HTTP Trigger (if using pg_net extension)
-- ============================================================================
-- If you have pg_net extension, you can make HTTP calls directly from PostgreSQL
-- This is more reliable than the notification approach above

-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- CREATE OR REPLACE FUNCTION trigger_financial_analysis_http()
-- RETURNS void AS $$
-- BEGIN
--   PERFORM net.http_post(
--     url := 'http://localhost:3000/api/ai-coo/trigger-analysis',
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := '{"analyzerType": "financial"}'::jsonb
--   );
-- END;
-- $$ LANGUAGE plpgsql;

-- SELECT cron.schedule(
--   'ai-coo-financial-hourly',
--   '0 * * * *',
--   $$SELECT trigger_financial_analysis_http()$$
-- );

-- ============================================================================
-- Utility Commands
-- ============================================================================

-- View all scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule a job
-- SELECT cron.unschedule('ai-coo-financial-hourly');

-- Update job schedule
-- SELECT cron.schedule('ai-coo-financial-hourly', '0 */2 * * *', $$SELECT trigger_financial_analysis()$$);
