const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/pbl_db' });
async function run() {
  await client.connect();
  const res = await client.query('SELECT "moodleId" FROM "Student" WHERE "moodleId" IS NOT NULL LIMIT 1');
  console.log(res.rows);
  await client.end();
}
run();
