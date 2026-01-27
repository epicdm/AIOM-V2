import { database } from '../src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Running AI COO migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'drizzle', '0019_ai_coo_tables.sql'),
      'utf-8'
    );
    
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      if (statement.startsWith('--')) continue; // Skip comments
      
      console.log('Executing:', statement.substring(0, 50) + '...');
      await database.execute(sql.raw(statement));
    }
    
    console.log('✅ AI COO migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
