const prisma = require('../config/db');

// @desc    Wipe all Teams, Team Members, and Submissions
// @route   DELETE /api/super-admin/wipe/teams
// @access  Private/SuperAdmin
const wipeTeams = async (req, res, next) => {
  try {
    // Delete all teams (cascades to teamMembers, submissions, etc.)
    await prisma.team.deleteMany({});
    res.json({ message: 'All Teams, Members, and Submissions have been wiped successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Wipe all PBLs
// @route   DELETE /api/super-admin/wipe/pbls
// @access  Private/SuperAdmin
const wipePbls = async (req, res, next) => {
  try {
    // Delete all PBLs (cascades to phases, teams, submissions, etc.)
    await prisma.pbl.deleteMany({});
    res.json({ message: 'All PBLs, Phases, and associated Teams have been wiped successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Wipe all Students
// @route   DELETE /api/super-admin/wipe/students
// @access  Private/SuperAdmin
const wipeStudents = async (req, res, next) => {
  try {
    // Delete student users (cascades to studentProfile, teamMembers, etc.)
    await prisma.user.deleteMany({ where: { role: 'STUDENT' } });
    res.json({ message: 'All Student records have been wiped successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Wipe all Faculty
// @route   DELETE /api/super-admin/wipe/faculty
// @access  Private/SuperAdmin
const wipeFaculty = async (req, res, next) => {
  try {
    // Delete faculty users (cascades to facultyProfile)
    await prisma.user.deleteMany({ where: { role: 'FACULTY' } });
    res.json({ message: 'All Faculty records have been wiped successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Wipe ENTIRE DATABASE
// @route   DELETE /api/super-admin/wipe/all
// @access  Private/SuperAdmin
const wipeAll = async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.team.deleteMany({}),
      prisma.pbl.deleteMany({}),
      prisma.user.deleteMany({ where: { role: { in: ['STUDENT', 'FACULTY', 'ADMIN'] } } })
    ]);
    res.json({ message: 'The entire database has been wiped successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get System Settings
// @route   GET /api/super-admin/settings
// @access  Private/SuperAdmin
const getSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    res.json(config);
  } catch (error) {
    next(error);
  }
};

// @desc    Update System Settings
// @route   POST /api/super-admin/settings
// @access  Private/SuperAdmin
const updateSettings = async (req, res, next) => {
  try {
    const { MOODLE_URL, MOODLE_API_TOKEN } = req.body;
    
    if (MOODLE_URL !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'MOODLE_URL' },
        update: { value: MOODLE_URL },
        create: { key: 'MOODLE_URL', value: MOODLE_URL }
      });
    }

    if (MOODLE_API_TOKEN !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'MOODLE_API_TOKEN' },
        update: { value: MOODLE_API_TOKEN },
        create: { key: 'MOODLE_API_TOKEN', value: MOODLE_API_TOKEN }
      });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  wipeTeams,
  wipePbls,
  wipeStudents,
  wipeFaculty,
  wipeAll,
  getSettings,
  updateSettings
};
