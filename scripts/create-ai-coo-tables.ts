import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function createTables() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if tables already exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('monitoring_jobs', 'analysis_results', 'alerts', 'alert_rules', 'daily_briefings', 'autonomous_actions', 'ai_coo_usage')
    `;
    
    const existing = await client.query(checkQuery);
    
    if (existing.rows.length > 0) {
      console.log('AI COO tables already exist:', existing.rows.map(r => r.table_name).join(', '));
      console.log('✅ Migration complete (tables already exist)');
      await client.end();
      process.exit(0);
      return;
    }

    console.log('Creating AI COO tables...');

    // Create tables one by one
    await client.query(`
      CREATE TABLE monitoring_jobs (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text,
        schedule text NOT NULL,
        analyzer_type text NOT NULL,
        config jsonb,
        enabled boolean DEFAULT true NOT NULL,
        last_run_at timestamp,
        next_run_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✓ Created monitoring_jobs');

    await client.query(`
      CREATE TABLE analysis_results (
        id text PRIMARY KEY NOT NULL,
        job_id text NOT NULL,
        run_at timestamp DEFAULT now() NOT NULL,
        status text NOT NULL,
        insights jsonb,
        metrics jsonb,
        alerts_generated integer DEFAULT 0 NOT NULL,
        duration_ms integer NOT NULL,
        cost numeric(10, 6),
        error_message text,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT analysis_results_job_id_fk FOREIGN KEY (job_id) REFERENCES monitoring_jobs(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created analysis_results');

    await client.query(`
      CREATE TABLE alerts (
        id text PRIMARY KEY NOT NULL,
        analysis_result_id text,
        type text NOT NULL,
        priority text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        data jsonb,
        status text DEFAULT 'new' NOT NULL,
        acknowledged_by text,
        acknowledged_at timestamp,
        resolved_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT alerts_analysis_result_id_fk FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id) ON DELETE CASCADE,
        CONSTRAINT alerts_acknowledged_by_fk FOREIGN KEY (acknowledged_by) REFERENCES "user"(id)
      )
    `);
    console.log('✓ Created alerts');

    await client.query(`
      CREATE TABLE alert_rules (
        id text PRIMARY KEY NOT NULL,
        user_id text,
        rule_type text NOT NULL,
        condition jsonb,
        enabled boolean DEFAULT true NOT NULL,
        notification_channels jsonb,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT alert_rules_user_id_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created alert_rules');

    await client.query(`
      CREATE TABLE daily_briefings (
        id text PRIMARY KEY NOT NULL,
        user_id text,
        date timestamp NOT NULL,
        content text NOT NULL,
        insights_count integer DEFAULT 0 NOT NULL,
        alerts_count integer DEFAULT 0 NOT NULL,
        recommendations_count integer DEFAULT 0 NOT NULL,
        delivered_at timestamp,
        delivery_method text,
        read_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT daily_briefings_user_id_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created daily_briefings');

    await client.query(`
      CREATE TABLE autonomous_actions (
        id text PRIMARY KEY NOT NULL,
        action_type text NOT NULL,
        target_system text NOT NULL,
        target_id text,
        description text NOT NULL,
        parameters jsonb,
        decision_reasoning text,
        requires_approval boolean DEFAULT true NOT NULL,
        approved_by text,
        approved_at timestamp,
        executed_at timestamp,
        status text DEFAULT 'pending' NOT NULL,
        result jsonb,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT autonomous_actions_approved_by_fk FOREIGN KEY (approved_by) REFERENCES "user"(id)
      )
    `);
    console.log('✓ Created autonomous_actions');

    await client.query(`
      CREATE TABLE ai_coo_usage (
        id text PRIMARY KEY NOT NULL,
        feature text NOT NULL,
        tokens_used integer NOT NULL,
        cost numeric(10, 6) NOT NULL,
        duration_ms integer NOT NULL,
        success boolean NOT NULL,
        error_message text,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✓ Created ai_coo_usage');

    console.log('\n✅ All AI COO tables created successfully!');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    await client.end();
    process.exit(1);
  }
}

createTables();
