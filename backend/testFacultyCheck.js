const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFaculty() {
  try {
    const faculty = await prisma.faculty.findMany({
      include: { user: true }
    });
    console.log("Total Faculty Profiles:", faculty.length);
    faculty.forEach(f => {
      console.log(`Faculty ID: ${f.id} | User Name: ${f.user.name} | User Email: ${f.user.email} | Moodle ID: ${f.moodleId}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFaculty();
