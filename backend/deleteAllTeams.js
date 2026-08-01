require('dotenv').config();
const prisma = require('./src/config/db');

async function deleteAllTeams() {
  try {
    console.log("Deleting all teams...");
    // Since teamMembers cascade on delete, we can just delete teams
    // But it's safer to delete team members first or use prisma transaction
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    console.log("All teams and team members deleted successfully.");
  } catch (error) {
    console.error("Error deleting teams:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllTeams();
