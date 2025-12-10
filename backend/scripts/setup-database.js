#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupDatabase() {
  console.log('🔄 Setting up database...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  try {
    console.log('📦 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');

    console.log('🗃️ Setting up database schema...');
    await execAsync('npx prisma db push --accept-data-loss --force-reset');
    console.log('✅ Database schema created');

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    // Try alternative approach
    try {
      console.log('🔄 Trying alternative migration approach...');
      await execAsync('npx prisma migrate deploy');
      console.log('✅ Migration deploy successful');
    } catch (migrationError) {
      console.error('❌ Migration deploy also failed:', migrationError.message);
      process.exit(1);
    }
  }
}

setupDatabase();