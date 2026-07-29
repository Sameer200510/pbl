const prisma = require('./src/config/db');

async function run() { 
  const f = await prisma.user.findFirst({where:{role:'FACULTY'}}); 
  console.log(f.email); 
} 
run();
