require('dotenv').config();
const prisma = require('./src/config/db');

async function test() {
  const user = await prisma.user.findFirst({
    where: { email: 'stest9@gmail.com' },
    include: { studentProfile: true }
  });
  console.log("User:", user);
}

test().catch(console.error).finally(() => prisma.$disconnect());
