import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting migration script...');
console.log('📂 Script directory:', __dirname);

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
    console.log('Error details:', error.message);
  }

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, '..', 'MIGRATION_FIX.sql');
    console.log('📄 Reading migration file from:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded successfully');

    // Split by semicolon and filter out comments and empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Applying ${statements.length} SQL statements...`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement + ';');
          successCount++;
          if ((i + 1) % 10 === 0) {
            console.log(`   Progress: ${i + 1}/${statements.length} statements`);
          }
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists') || 
              err.message.includes('duplicate column') ||
              err.message.includes('duplicate key')) {
            skipCount++;
          } else {
            console.error(`❌ Error on statement ${i + 1}: ${err.message}`);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log(`✅ Migration completed! Applied: ${successCount}, Skipped: ${skipCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('✨ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
