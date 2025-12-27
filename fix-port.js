import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');

console.log('🔧 Fixing DATABASE_URL port...\n');

try {
  // Read the .env file
  let envContent = readFileSync(envPath, 'utf8');
  
  console.log('📄 Current .env content (DATABASE_URL only):');
  const currentDbUrl = envContent.match(/DATABASE_URL=.*/);
  if (currentDbUrl) {
    console.log('   ' + currentDbUrl[0].replace(/:([^@]+)@/, ':****@'));
  }
  
  // Replace port 5432 with 6543 in DATABASE_URL
  const updated = envContent.replace(
    /(DATABASE_URL=postgresql:\/\/[^:]+:[^@]+@[^:]+):5432(\/\w+)/g,
    '$1:6543$2'
  );
  
  if (updated === envContent) {
    console.log('\n⚠️  No change needed - port is already set correctly or DATABASE_URL format is different');
    console.log('\n📋 Please manually update your DATABASE_URL to use port 6543:');
    console.log('   Change: ...supabase.co:5432/postgres');
    console.log('   To:     ...supabase.co:6543/postgres');
  } else {
    // Write back to .env
    writeFileSync(envPath, updated, 'utf8');
    
    console.log('\n✅ Successfully updated DATABASE_URL!');
    console.log('\n📄 New DATABASE_URL:');
    const newDbUrl = updated.match(/DATABASE_URL=.*/);
    if (newDbUrl) {
      console.log('   ' + newDbUrl[0].replace(/:([^@]+)@/, ':****@'));
    }
    
    console.log('\n🎉 Port changed from 5432 → 6543');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: node src/check-env.js');
    console.log('   2. Run: node src/test-db-connection.js');
    console.log('   3. Run: npm start');
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📝 Manual fix required:');
  console.log('   1. Open your .env file');
  console.log('   2. Find the DATABASE_URL line');
  console.log('   3. Change port 5432 to 6543');
  console.log('   4. Save the file');
}

console.log('\n' + '='.repeat(50) + '\n');
