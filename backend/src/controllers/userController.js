const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const moodleService = require('../services/moodleService');

const toRoman = (num) => {
  const roman = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return roman[num] || String(num);
};

const assignPblFacultyIds = async (pblId, facultyId) => {
  const existing = await prisma.pblFaculty.findUnique({
    where: { pblId_facultyId: { pblId, facultyId } }
  });

  if (existing && existing.mentorIdFormatted) {
    return existing;
  }

  const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
  if (!pbl) return null;

  const count = await prisma.pblFaculty.count({
    where: {
      pblId,
      mentorIdFormatted: { not: null }
    }
  });

  const seq = String(count + 1).padStart(3, '0');
  const romanSem = toRoman(pbl.semester);
  const mentorId = `${pbl.subjectShort}-${romanSem}-M-${seq}`;
  const evaluatorId = `EV-${romanSem}-${pbl.subjectShort}-${seq}`;

  return await prisma.pblFaculty.upsert({
    where: { pblId_facultyId: { pblId, facultyId } },
    update: {
      mentorIdFormatted: existing?.mentorIdFormatted || mentorId,
      evaluatorIdFormatted: existing?.evaluatorIdFormatted || evaluatorId
    },
    create: {
      pblId,
      facultyId,
      mentorIdFormatted: mentorId,
      evaluatorIdFormatted: evaluatorId
    }
  });
};

// @desc    Get all users (Students & Faculty)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        studentProfile: true,
        facultyProfile: {
          include: {
            pblFaculties: {
              include: { pbl: true }
            }
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a user manually
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res, next) => {
  try {
    const { username, firstname, lastname, email, role1, course1, password } = req.body;

    if (!username || !email || !role1) {
      return res.status(400).json({ message: 'Username, email and role1 are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const name = `${firstname || ''} ${lastname || ''}`.trim() || username;
    const defaultPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('Pbl@1234', 10);
    const roleEnum = role1.toLowerCase() === 'student' ? 'STUDENT' : 'FACULTY';

    let userData = {
      name,
      email,
      passwordHash: defaultPassword,
      role: roleEnum,
      requiresPasswordChange: true
    };

    if (roleEnum === 'STUDENT') {
      userData.studentProfile = {
        create: {
          enrollmentNumber: username,
          moodleId: username,
          section: 'A', // Default or make dynamic later
          semester: 1
        }
      };
    } else {
      userData.facultyProfile = {
        create: {
          department: 'General',
          moodleId: String(username)
        }
      };
    }

    const newUser = await prisma.user.create({
      data: userData,
      include: { studentProfile: true, facultyProfile: true }
    });

    // Handle course mapping for Faculty
    if (roleEnum === 'FACULTY' && course1) {
      const pbl = await prisma.pbl.findFirst({ where: { subjectShort: course1 } });
      if (pbl) {
        await assignPblFacultyIds(pbl.id, newUser.facultyProfile.id);
      }
    }

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload Users (Moodle Format)
// @route   POST /api/users/bulk
// @access  Private/Admin
const bulkUploadUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let addedCount = 0;
    let updatedCount = 0;

    for (const row of data) {
      const username = row['username'] ? String(row['username']).trim() : '';
      const firstname = row['firstname'] ? String(row['firstname']).trim() : '';
      const lastname = row['lastname'] ? String(row['lastname']).trim() : '';
      const email = row['email'] ? String(row['email']).trim().toLowerCase() : '';
      const course1 = row['course1'] ? String(row['course1']).trim() : '';
      const role1 = row['role1'] ? String(row['role1']).trim() : '';
      const rawPassword = row['password'] || 'Pbl@1234';
      const semester = parseInt(row['semester']) || 1;
      const section = row['section'] ? String(row['section']).toUpperCase().trim() : 'A';
      const rollno = row['rollno'] ? String(row['rollno']).trim() : username;

      if (!username || !email || !role1) continue;

      const name = `${firstname} ${lastname}`.trim() || username;
      const roleEnum = role1.toLowerCase() === 'student' ? 'STUDENT' : 'FACULTY';
      
      let existingUser = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true, facultyProfile: true }
      });

      if (!existingUser && roleEnum === 'STUDENT') {
        const conditions = [];
        if (rollno) conditions.push({ enrollmentNumber: rollno }, { moodleId: rollno });
        if (username && username !== rollno) conditions.push({ enrollmentNumber: username }, { moodleId: username });
        
        if (conditions.length > 0) {
          const student = await prisma.student.findFirst({
            where: { OR: conditions },
            include: { user: { include: { studentProfile: true, facultyProfile: true } } }
          });
          if (student) existingUser = student.user;
        }
      } else if (!existingUser && roleEnum === 'FACULTY' && username) {
        const faculty = await prisma.faculty.findFirst({
          where: { moodleId: username },
          include: { user: { include: { studentProfile: true, facultyProfile: true } } }
        });
        if (faculty) existingUser = faculty.user;
      }

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        let userData = {
          name,
          email,
          passwordHash,
          role: roleEnum,
          requiresPasswordChange: true
        };

        if (roleEnum === 'STUDENT') {
          userData.studentProfile = {
            create: { enrollmentNumber: rollno, moodleId: username, section, semester }
          };
        } else {
          userData.facultyProfile = {
            create: { department: 'General', moodleId: username }
          };
        }

        const newUser = await prisma.user.create({
          data: userData,
          include: { facultyProfile: true }
        });

        if (roleEnum === 'FACULTY' && course1) {
          const pbl = await prisma.pbl.findFirst({ where: { subjectShort: { equals: course1, mode: 'insensitive' } } });
          if (pbl) await assignPblFacultyIds(pbl.id, newUser.facultyProfile.id);
        }

        addedCount++;
      } else {
        // Only update name if it matches the same email
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: (existingUser.email === email ? name : existingUser.name) },
          include: { facultyProfile: true, studentProfile: true }
        });

        if (roleEnum === 'STUDENT' && updatedUser.studentProfile) {
          // Update moodleId, semester, and section
          await prisma.student.update({
            where: { id: updatedUser.studentProfile.id },
            data: { 
              moodleId: updatedUser.studentProfile.moodleId || username,
              semester: semester,
              section: section
            }
          });
        }
        
        if (roleEnum === 'FACULTY' && updatedUser.facultyProfile) {
          if (!updatedUser.facultyProfile.moodleId) {
            await prisma.faculty.update({
              where: { id: updatedUser.facultyProfile.id },
              data: { moodleId: username }
            });
          }
          if (course1) {
            const pbl = await prisma.pbl.findFirst({ where: { subjectShort: { equals: course1, mode: 'insensitive' } } });
            if (pbl) await assignPblFacultyIds(pbl.id, updatedUser.facultyProfile.id);
          }
        }
        updatedCount++;
      }
    }

    res.json({ message: `Success! Added ${addedCount} and updated ${updatedCount} users.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload Users via JSON (mapped)
// @route   POST /api/users/bulk-json
// @access  Private/Admin
const bulkUploadUsersJson = async (req, res, next) => {
  try {
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of user objects');
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const row of data) {
      const username = row['username'] ? String(row['username']).trim() : '';
      const firstname = row['firstname'] ? String(row['firstname']).trim() : '';
      const lastname = row['lastname'] ? String(row['lastname']).trim() : '';
      const email = row['email'] ? String(row['email']).trim().toLowerCase() : '';
      const role1 = row['role1'] ? String(row['role1']).trim() : '';
      const rawPassword = row['password'] || 'Pbl@1234';
      const semester = parseInt(row['semester']) || 1;
      const section = row['section'] ? String(row['section']).toUpperCase().trim() : 'A';
      const rollno = row['rollno'] ? String(row['rollno']).trim() : username;

      // Extract all course fields like course1, course2, etc.
      const courses = [];
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().startsWith('course') && row[key]) {
          courses.push(String(row[key]).trim());
        }
      });

      if (!username || !email || !role1) continue;

      const name = `${firstname} ${lastname}`.trim() || username;
      const roleEnum = role1.toLowerCase() === 'student' ? 'STUDENT' : 'FACULTY';
      
      let existingUser = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true, facultyProfile: true }
      });

      if (!existingUser && roleEnum === 'STUDENT') {
        const conditions = [];
        if (rollno) conditions.push({ enrollmentNumber: rollno }, { moodleId: rollno });
        if (username && username !== rollno) conditions.push({ enrollmentNumber: username }, { moodleId: username });
        
        if (conditions.length > 0) {
          const student = await prisma.student.findFirst({
            where: { OR: conditions },
            include: { user: { include: { studentProfile: true, facultyProfile: true } } }
          });
          if (student) existingUser = student.user;
        }
      } else if (!existingUser && roleEnum === 'FACULTY' && username) {
        const faculty = await prisma.faculty.findFirst({
          where: { moodleId: username },
          include: { user: { include: { studentProfile: true, facultyProfile: true } } }
        });
        if (faculty) existingUser = faculty.user;
      }

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        let userData = {
          name,
          email,
          passwordHash,
          role: roleEnum,
          requiresPasswordChange: true
        };

        if (roleEnum === 'STUDENT') {
          userData.studentProfile = {
            create: { enrollmentNumber: rollno, moodleId: username, section, semester }
          };
        } else {
          userData.facultyProfile = {
            create: { department: 'General', moodleId: username }
          };
        }

        const newUser = await prisma.user.create({
          data: userData,
          include: { facultyProfile: true }
        });

        if (roleEnum === 'FACULTY' && courses.length > 0) {
          for (const c of courses) {
            const pbl = await prisma.pbl.findFirst({ where: { subjectShort: { equals: c, mode: 'insensitive' } } });
            if (pbl) await assignPblFacultyIds(pbl.id, newUser.facultyProfile.id);
          }
        }

        addedCount++;
      } else {
        // Only update name if it matches the same email
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: (existingUser.email === email ? name : existingUser.name) },
          include: { facultyProfile: true, studentProfile: true }
        });

        if (roleEnum === 'STUDENT' && updatedUser.studentProfile) {
          await prisma.student.update({
            where: { id: updatedUser.studentProfile.id },
            data: { 
              moodleId: updatedUser.studentProfile.moodleId || username,
              semester: semester,
              section: section
            }
          });
        }
        
        if (roleEnum === 'FACULTY' && updatedUser.facultyProfile) {
          if (!updatedUser.facultyProfile.moodleId) {
            await prisma.faculty.update({
              where: { id: updatedUser.facultyProfile.id },
              data: { moodleId: username }
            });
          }
          if (courses.length > 0) {
            for (const c of courses) {
              const pbl = await prisma.pbl.findFirst({ where: { subjectShort: { equals: c, mode: 'insensitive' } } });
              if (pbl) await assignPblFacultyIds(pbl.id, updatedUser.facultyProfile.id);
            }
          }
        }
        updatedCount++;
      }
    }

    res.json({ message: `Success! Added ${addedCount} and updated ${updatedCount} users.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, section, department } = req.body;

    const user = await prisma.user.findUnique({ where: { id }, include: { studentProfile: true, facultyProfile: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.user.update({
      where: { id },
      data: { name, email }
    });

    if (user.role === 'STUDENT' && section) {
      await prisma.student.update({
        where: { userId: id },
        data: { section }
      });
    } else if (user.role === 'FACULTY' && department) {
      await prisma.faculty.update({
        where: { userId: id },
        data: { department }
      });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ 
      where: { id }, 
      include: { studentProfile: true, facultyProfile: true } 
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.studentProfile) {
      const studentId = user.studentProfile.id;
      // 1. Delete teams where student is the leader
      await prisma.team.deleteMany({ where: { leaderId: studentId } });
      // 2. Delete team memberships
      await prisma.teamMember.deleteMany({ where: { studentId } });
      // 3. Delete evaluations
      await prisma.evaluation.deleteMany({ where: { studentId } });
      // 4. Delete reevaluations
      await prisma.reevaluationAssignment.deleteMany({ where: { studentId } });
      // 5. Delete interaction records
      await prisma.interactionRecord.deleteMany({ where: { studentId } });
      // 6. Delete micro mentor evals
      await prisma.microMentorEvaluation.deleteMany({ where: { reviewerStudentId: studentId } });
      // 7. Delete student record
      await prisma.student.delete({ where: { id: studentId } });
    }

    if (user.facultyProfile) {
      const facultyId = user.facultyProfile.id;
      await prisma.team.updateMany({ where: { mentorId: facultyId }, data: { mentorId: null, mentorIdFormatted: null } });
      await prisma.pblFaculty.deleteMany({ where: { facultyId } });
      await prisma.teamPhaseEvaluator.deleteMany({ where: { evaluatorId: facultyId } });
      await prisma.mentorGrade.deleteMany({ where: { mentorId: facultyId } });
      await prisma.faculty.delete({ where: { id: facultyId } });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) return res.status(400).json({ message: 'New password is required' });

    const user = await prisma.user.findUnique({ 
      where: { id },
      include: { studentProfile: true, facultyProfile: true } 
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id },
      data: { passwordHash, requiresPasswordChange: true }
    });

    // Try to sync with Moodle
    let moodleUsername = user.email; // Default fallback
    if (user.role === 'STUDENT' && user.studentProfile) {
      moodleUsername = user.studentProfile.enrollmentNumber;
    } else if (user.role === 'FACULTY') {
       moodleUsername = user.email.split('@')[0]; 
    }

    const { syncMoodlePassword } = require('../services/moodleService');
    await syncMoodlePassword(moodleUsername, newPassword).catch(() => {});

    res.json({ message: 'Password reset successfully and synced with Moodle (if configured).' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete users
// @route   POST /api/users/bulk-delete
// @access  Private/Admin
const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No user IDs provided' });
    }

    // Check if user is trying to delete themselves
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Find student profiles
    const students = await prisma.student.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    // Find faculty profiles
    const faculties = await prisma.faculty.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const facultyIds = faculties.map(f => f.id);

    if (studentIds.length > 0) {
      // 1. Delete teams where these students are leaders
      await prisma.team.deleteMany({ where: { leaderId: { in: studentIds } } });
      // 2. Delete team memberships
      await prisma.teamMember.deleteMany({ where: { studentId: { in: studentIds } } });
      // 3. Delete evaluations
      await prisma.evaluation.deleteMany({ where: { studentId: { in: studentIds } } });
      // 4. Delete reevaluations
      await prisma.reevaluationAssignment.deleteMany({ where: { studentId: { in: studentIds } } });
      // 5. Delete interaction records
      await prisma.interactionRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      // 6. Delete micro mentor evals
      await prisma.microMentorEvaluation.deleteMany({ where: { reviewerStudentId: { in: studentIds } } });
      // 7. Delete student records
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    }

    if (facultyIds.length > 0) {
      await prisma.team.updateMany({ where: { mentorId: { in: facultyIds } }, data: { mentorId: null, mentorIdFormatted: null } });
      await prisma.pblFaculty.deleteMany({ where: { facultyId: { in: facultyIds } } });
      await prisma.teamPhaseEvaluator.deleteMany({ where: { evaluatorId: { in: facultyIds } } });
      await prisma.mentorGrade.deleteMany({ where: { mentorId: { in: facultyIds } } });
      await prisma.faculty.deleteMany({ where: { id: { in: facultyIds } } });
    }

    const deleteResult = await prisma.user.deleteMany({
      where: {
        id: { in: userIds }
      }
    });

    res.json({ message: `${deleteResult.count} users deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  bulkUploadUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  bulkDeleteUsers,
  bulkUploadUsersJson
};
