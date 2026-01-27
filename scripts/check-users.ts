import { database } from '../src/db';
import { user } from '../src/db/schema';

async function checkUsers() {
  const users = await database.select().from(user).limit(5);

  console.log(`\nFound ${users.length} users:\n`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email || 'No email'}`);
    console.log(`   ID: ${u.id}`);
    console.log(`   Name: ${u.name || 'No name'}`);
    console.log();
  });

  process.exit(0);
}

checkUsers();
