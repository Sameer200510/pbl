require('dotenv').config();
const prisma = require('./src/config/db.js');

async function run() {
  const pbls = await prisma.pbl.findMany();
  console.log(pbls);
}

run().catch(console.error).finally(() => prisma.$disconnect());
