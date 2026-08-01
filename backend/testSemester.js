require('dotenv').config();
const prisma = require('./src/config/db.js');

async function run() {
  const pbls = await prisma.pbl.findMany({ select: { subjectShort: true, semester: true, isArchived: true } });
  console.log("PBLs:", pbls);
  
  const student = await prisma.student.findFirst({
    where: { enrollmentNumber: 'stest9' },
    select: { enrollmentNumber: true, semester: true }
  });
  console.log("Student stest9:", student);
}

run().catch(console.error).finally(() => prisma.$disconnect());
