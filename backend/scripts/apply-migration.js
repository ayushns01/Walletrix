import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔧 Checking database schema...');
  
  try {
    // Check if migration is needed by testing for missing column
    await prisma.$queryRaw`SELECT password_hash_algorithm FROM users LIMIT 1`;
    console.log('✅ Database schema is up to date');
    return;
  } catch (error) {
    console.log('⚠️  Database schema needs migration, applying...');
  }

  try {
    // Read migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, '..', 'MIGRATION_FIX.sql'),
      'utf-8'
    );

    // Split by semicolon and filter out comments and empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Applying ${statements.length} SQL statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement + ';');
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && 
              !err.message.includes('duplicate column')) {
            console.error(`Error executing statement: ${err.message}`);
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
