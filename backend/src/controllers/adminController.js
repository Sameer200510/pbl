const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const { enrollUserInMoodleCourse } = require('../services/moodleService');

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
// @access  Private/Admin
const createPbl = async (req, res, next) => {
  try {
    const {
      subject,
      subjectShort,
      semester,
      session,
      description,
      instructions,
      teamFormationStart,
      teamFormationEnd,
      moodleCourseId
    } = req.body;

    const pbl = await prisma.pbl.create({
      data: {
        subject,
        subjectShort,
        semester: parseInt(semester),
        session: session || "2024-2025",
        description,
        instructions,
        teamFormationStart: teamFormationStart ? new Date(teamFormationStart) : null,
        teamFormationEnd: teamFormationEnd ? new Date(teamFormationEnd) : null,
        moodleCourseId: moodleCourseId || null,
        createdBy: req.user.id,
        phases: {
          create: [
            { phaseNumber: 1, instructions: 'Phase 1 instructions pending...', evaluationCriteria: [] },
            { phaseNumber: 2, instructions: 'Phase 2 instructions pending...', evaluationCriteria: [] },
            { phaseNumber: 3, instructions: 'Phase 3 instructions pending...', evaluationCriteria: [] }
          ]
        }
      },
      include: { phases: true }
    });

    res.status(201).json(pbl);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all PBLs
// @route   GET /api/admin/pbl
// @access  Private/Admin
const getPbls = async (req, res, next) => {
  try {
    const pbls = await prisma.pbl.findMany({
      orderBy: { createdAt: 'desc' },
      include: { phases: { orderBy: { phaseNumber: 'asc' } } }
    });
    res.json(pbls);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a PBL
// @route   PUT /api/admin/pbl/:id
// @access  Private/Admin
const updatePbl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (updateData.semester) updateData.semester = parseInt(updateData.semester);
    if (updateData.teamFormationStart) updateData.teamFormationStart = new Date(updateData.teamFormationStart);
    if (updateData.teamFormationEnd) updateData.teamFormationEnd = new Date(updateData.teamFormationEnd);
    if (updateData.moodleCourseId === '') updateData.moodleCourseId = null;

    const updatedPbl = await prisma.pbl.update({
      where: { id },
      data: updateData
    });

    res.json(updatedPbl);
  } catch (error) {
    next(error);
  }
};

// @desc    Archive a PBL
// @route   DELETE /api/admin/pbl/:id
// @access  Private/Admin
const archivePbl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const archivedPbl = await prisma.pbl.update({
      where: { id },
      data: { isArchived: true }
    });
    res.json({ message: 'PBL Archived Successfully', pbl: archivedPbl });
  } catch (error) {
    next(error);
  }
};

// @desc    Update dynamic registration form schema
// @desc    Update PBL Team Formation Timeline
// @route   POST /api/admin/pbl/:id/timeline
// @access  Private/Admin
const updatePblTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start, end } = req.body; 

    const updatedPbl = await prisma.pbl.update({
      where: { id },
      data: { 
        teamFormationStart: start ? new Date(start) : null,
        teamFormationEnd: end ? new Date(end) : null
      }
    });

    res.json({ message: 'Team formation timeline updated successfully', pbl: updatedPbl });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Phase Submission Timeline
// @route   POST /api/admin/pbl/:id/phase-timeline/:phaseNumber
// @access  Private/Admin
const updatePhaseTimeline = async (req, res, next) => {
  try {
    const { id, phaseNumber } = req.params;
    const { start, end } = req.body; 

    const phase = await prisma.phase.upsert({
      where: {
        pblId_phaseNumber: {
          pblId: id,
          phaseNumber: parseInt(phaseNumber)
        }
      },
      update: {
        submissionStart: start ? new Date(start) : null,
        submissionEnd: end ? new Date(end) : null
      },
      create: {
        pblId: id,
        phaseNumber: parseInt(phaseNumber),
        submissionStart: start ? new Date(start) : null,
        submissionEnd: end ? new Date(end) : null,
        instructions: `Phase ${phaseNumber} instructions pending...`,
        evaluationCriteria: []
      }
    });

    res.json({ message: `Phase ${phaseNumber} timeline updated successfully`, phase });
  } catch (error) {
    next(error);
  }
};


// @desc    Upload Faculty via Excel
// @route   POST /api/admin/faculty/upload
// @access  Private/Admin
const uploadFaculty = async (req, res, next) => {
  try {
    // Validate file
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel file');
    }
    // Expect pblId in request body to know which PBL to target
    const { pblId } = req.body;
    if (!pblId) {
      res.status(400);
      throw new Error('Please provide a pblId');
    }
    // Remove any previously linked faculty for this PBL
    await prisma.pblFaculty.deleteMany({ where: { pblId } });

    // Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const facultyData = xlsx.utils.sheet_to_json(sheet);

    let addedCount = 0;

    for (const row of facultyData) {
      const email = row['Faculty Email'] || row['Email'];
      const name = row['Faculty Name'] || row['Name'];
      const department = row['Department'] || 'General';

      if (!email || !name) continue;

      const defaultPassword = await bcrypt.hash(email, 10);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      let facultyId;
      if (!existingUser) {
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: defaultPassword,
            role: 'FACULTY',
            facultyProfile: { create: { department } }
          },
          include: { facultyProfile: true }
        });
        facultyId = newUser.facultyProfile.id;
        addedCount++;
      } else {
        // Ensure faculty profile exists
        const faculty = await prisma.faculty.upsert({
          where: { userId: existingUser.id },
          update: { department },
          create: { userId: existingUser.id, department }
        });
        facultyId = faculty.id;
      }
      // Link faculty to the PBL
      await prisma.pblFaculty.create({ data: { pblId, facultyId } });
    }

    res.json({ message: `Successfully imported ${addedCount} faculties.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload Faculty via JSON
// @route   POST /api/admin/faculty/bulk
// @access  Private/Admin
const bulkUploadFaculty = async (req, res, next) => {
  try {
    const { faculties, pblId, wipeOldData } = req.body;
    if (!faculties || !Array.isArray(faculties)) {
      res.status(400);
      throw new Error('Please provide an array of faculties');
    }
    if (!pblId) {
      res.status(400);
      throw new Error('Please provide a pblId');
    }

    if (wipeOldData) {
      await prisma.pblFaculty.deleteMany({
        where: { pblId: pblId }
      });
    }

    let addedCount = 0;

    for (const row of faculties) {
      const email = row.email;
      const name = row.name;
      const department = row.department || 'General';
      const moodleId = row.moodleId ? String(row.moodleId) : undefined;
      const password = row.password ? String(row.password) : undefined;

      if (!email || !name) continue;

      const passwordToHash = password || email;
      const hashedPassword = await bcrypt.hash(passwordToHash, 10);

      let facultyRecord;
      const existingUser = await prisma.user.findUnique({ where: { email }, include: { facultyProfile: true } });
      
      if (!existingUser) {
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: hashedPassword,
            role: 'FACULTY',
            isVerified: true,
            facultyProfile: {
              create: { department, moodleId }
            }
          },
          include: { facultyProfile: true }
        });
        facultyRecord = newUser.facultyProfile;
        addedCount++;
      } else if (existingUser.role === 'FACULTY' && existingUser.facultyProfile) {
        await prisma.user.update({
          where: { email },
          data: { passwordHash: hashedPassword, isVerified: true }
        });
        facultyRecord = await prisma.faculty.update({
          where: { id: existingUser.facultyProfile.id },
          data: { moodleId, department }
        });
      }

      if (facultyRecord) {
        await assignPblFacultyIds(pblId, facultyRecord.id);
      }
    }

    res.json({ message: `Successfully imported ${addedCount} faculties.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload Students via JSON
// @route   POST /api/admin/students/bulk
// @access  Private/Admin
const bulkUploadStudents = async (req, res, next) => {
  try {
    const { students, semester, wipeOldData } = req.body;
    if (!students || !Array.isArray(students)) {
      res.status(400);
      throw new Error('Please provide an array of students');
    }
    const targetSemester = semester ? parseInt(semester) : 1;

    if (wipeOldData) {
      await prisma.user.deleteMany({
        where: {
          role: 'STUDENT',
          studentProfile: {
            semester: targetSemester
          }
        }
      });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skipped = [];

    for (const row of students) {
      let { name, email, rollNo, section, moodleId, password } = row;
      if (!name || !rollNo || !section) {
        skipped.push({ name: name || 'N/A', rollNo: rollNo || 'N/A', reason: 'Missing mandatory field (Name, Roll No, or Section)' });
        continue;
      }

      rollNo = String(rollNo);
      moodleId = moodleId ? String(moodleId) : undefined;
      section = String(section);

      const finalEmail = email || `${moodleId || rollNo.toLowerCase()}@geu.ac.in`;
      const passwordToHash = password || finalEmail;
      const hashedPassword = await bcrypt.hash(passwordToHash, 10);

      const existingUser = await prisma.user.findUnique({ where: { email: finalEmail }, include: { studentProfile: true } });
      const existingRollNo = await prisma.student.findUnique({ where: { enrollmentNumber: rollNo } });

      if (!existingUser && !existingRollNo) {
        // Create new user and student profile
        await prisma.user.create({
          data: {
            name,
            email: finalEmail,
            passwordHash: hashedPassword,
            role: 'STUDENT',
            isVerified: true,
            studentProfile: {
              create: {
                enrollmentNumber: rollNo,
                section,
                semester: targetSemester,
                moodleId: String(moodleId)
              }
            }
          }
        });
        addedCount++;
      } else if (existingUser && existingUser.role === 'STUDENT' && existingUser.studentProfile) {
        // Update existing user with moodle ID and optionally reset password
        await prisma.user.update({
          where: { email: finalEmail },
          data: { passwordHash: hashedPassword, isVerified: true }
        });
        await prisma.student.update({
          where: { id: existingUser.studentProfile.id },
          data: { 
            moodleId: String(moodleId), 
            section: section,
            semester: targetSemester 
          }
        });
        updatedCount++;
      } else if (existingRollNo) {
        // Roll no exists but different email, update moodleId and section
        await prisma.student.update({
          where: { enrollmentNumber: rollNo },
          data: { 
            moodleId: String(moodleId), 
            section: section,
            semester: targetSemester
          }
        });
        // Also update the associated user password
        await prisma.user.update({
          where: { id: existingRollNo.userId },
          data: { passwordHash: hashedPassword, isVerified: true }
        });
        updatedCount++;
      }
    }

    res.json({ message: `Successfully imported ${addedCount} students and updated ${updatedCount} existing.`, added: addedCount, updated: updatedCount, skipped });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private/Admin
const getAllStudents = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: [
        { semester: 'asc' },
        { enrollmentNumber: 'asc' }
      ]
    });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Mentors to Teams
// @route   POST /api/admin/mentor-mapping
// @access  Private/Admin
const assignMentors = async (req, res, next) => {
  try {
    const { pblId, assignments } = req.body; 
    // assignments: [{ teamId, facultyId }]

    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) throw new Error('PBL not found');

    let assignedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        const team = await tx.team.findUnique({ where: { id: assignment.teamId } });
        if (!team) continue;

        const mentorCount = await tx.team.count({
          where: { pblId, mentorId: assignment.facultyId }
        });
        
        const toRoman = (num) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][num] || num;
        const romanSem = toRoman(pbl.semester);
        
        const runningNumber = String(mentorCount + 1).padStart(3, '0');
        const mentorIdFormatted = `${pbl.subjectShort}-${romanSem}-M-${runningNumber}`;

        await tx.team.update({
          where: { id: team.id },
          data: { 
            mentorId: assignment.facultyId,
            mentorIdFormatted
          }
        });
        assignedCount++;
      }
    });

    // Auto-enroll mentors in Moodle Course if configured
    if (pbl.moodleCourseId) {
      setTimeout(async () => {
        try {
          // Extract unique faculty IDs
          const facultyIds = [...new Set(assignments.map(a => a.facultyId))];
          const faculties = await prisma.faculty.findMany({
            where: { id: { in: facultyIds } },
            include: { user: true }
          });
          
          for (const faculty of faculties) {
            const moodleUsername = faculty.moodleId || faculty.user.email;
            await enrollUserInMoodleCourse(moodleUsername, pbl.moodleCourseId, 'teacher');
          }
        } catch (err) {
          console.error(`[MoodleSync] Error auto-enrolling mentors in Moodle:`, err);
        }
      }, 0);
    }

    res.json({ message: `Successfully assigned ${assignedCount} mentors.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Reports
// @route   GET /api/admin/reports/:type
// @access  Private/Admin
const downloadReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    let data = [];

    switch (type) {
      case 'students':
        const students = await prisma.student.findMany({ include: { user: true } });
        data = students.map(s => ({
          Name: s.user.name,
          Email: s.user.email,
          'Enrollment No': s.enrollmentNumber,
          Section: s.section,
          Phone: s.phoneNumber || 'N/A'
        }));
        break;
      
      case 'teams':
        const teams = await prisma.team.findMany({ 
          include: { 
            pbl: { include: { phases: true } }, 
            leader: { include: { user: true } }, 
            mentor: true,
            phaseEvaluators: { include: { evaluator: true } }
          } 
        });
        data = teams.map(t => {
          const evalP1 = t.phaseEvaluators.find(pe => pe.phaseId === t.pbl.phases?.[0]?.id)?.evaluator;
          const evalP2 = t.phaseEvaluators.find(pe => pe.phaseId === t.pbl.phases?.[1]?.id)?.evaluator;
          const evalP3 = t.phaseEvaluators.find(pe => pe.phaseId === t.pbl.phases?.[2]?.id)?.evaluator;

          return {
            'Team ID': t.teamIdFormatted,
            PBL: t.pbl.subjectShort,
            'Leader Name': t.leader.user.name,
            'Mentor Venue': t.mentor?.venue || '',
            'P1 Evaluator Venue': evalP1?.venue || '',
            'P2 Evaluator Venue': evalP2?.venue || '',
            'P3 Evaluator Venue': evalP3?.venue || '',
            'Created At': t.createdAt.toLocaleDateString()
          };
        });
        break;

      default:
        res.status(400);
        throw new Error('Invalid report type');
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${type}_report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset User Password
// @route   POST /api/admin/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        passwordHash,
        isVerified: true 
      },
      include: {
        studentProfile: true,
        facultyProfile: true
      }
    });

    // Background sync to Moodle if moodleId exists
    const moodleId = updatedUser.studentProfile?.moodleId || updatedUser.facultyProfile?.moodleId;
    if (moodleId) {
      const { syncMoodlePassword } = require('../services/moodleService');
      syncMoodlePassword(moodleId, newPassword).catch(err => {
        console.error('Non-blocking Moodle sync error from Admin reset:', err);
      });
    }

    res.json({ message: `Password reset successfully for ${updatedUser.email}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const pblId = req.query.pblId;
    let studentCount = 0;

    if (pblId) {
      const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
      if (pbl) {
        if (pbl.moodleCourseId) {
          const { countMoodleCourseUsers } = require('../services/moodleService');
          const count = await countMoodleCourseUsers(pbl.moodleCourseId);
          if (count !== null) {
            studentCount = count;
          } else {
            studentCount = await prisma.student.count({ where: { semester: pbl.semester } });
          }
        } else {
          studentCount = await prisma.student.count({ where: { semester: pbl.semester } });
        }
      } else {
        studentCount = await prisma.student.count();
      }
    } else {
      studentCount = await prisma.student.count();
    }

    const teamCount = await prisma.team.count(
      pblId ? { where: { pblId } } : undefined
    );

    const studentsWithTeamCount = await prisma.student.count({
      where: pblId ? { teamMembers: { some: { team: { pblId } } } } : { teamMembers: { some: {} } }
    });

    const studentsWithoutTeam = studentCount - studentsWithTeamCount;

    const facultyCount = await prisma.faculty.count();
    
    const activePblsCount = await prisma.pbl.count({
      where: { isArchived: false }
    });

    const teamsWithMentor = await prisma.team.count({
      where: pblId ? { pblId, mentorId: { not: null } } : { mentorId: { not: null } }
    });

    const phase1Complete = await prisma.submission.count({
      where: pblId ? { team: { pblId }, phase: { phaseNumber: 1 }, status: 'GRADED' } : { phase: { phaseNumber: 1 }, status: 'GRADED' }
    });

    const phase2Complete = await prisma.submission.count({
      where: pblId ? { team: { pblId }, phase: { phaseNumber: 2 }, status: 'GRADED' } : { phase: { phaseNumber: 2 }, status: 'GRADED' }
    });

    const phase3Complete = await prisma.submission.count({
      where: pblId ? { team: { pblId }, phase: { phaseNumber: 3 }, status: 'GRADED' } : { phase: { phaseNumber: 3 }, status: 'GRADED' }
    });

    res.json({
      students: studentCount,
      teams: teamCount,
      faculty: facultyCount,
      activePbls: activePblsCount,
      studentsWithTeam: studentsWithTeamCount,
      studentsWithoutTeam,
      graphData: [
        { name: 'Step 1: Teams', value: teamCount },
        { name: 'Step 2: Mentors', value: teamsWithMentor },
        { name: 'Step 3: Phase 1', value: phase1Complete },
        { name: 'Step 4: Phase 2', value: phase2Complete },
        { name: 'Step 5: Phase 3', value: phase3Complete }
      ]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get System Settings
// @route   GET /api/admin/settings
// @access  Private/SuperAdmin
const getSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' }
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update System Settings
// @route   PUT /api/admin/settings
// @access  Private/SuperAdmin
const updateSettings = async (req, res, next) => {
  try {
    const { awsAccessKeyId, awsSecretAccessKey, awsRegion, awsS3Bucket, useS3Storage } = req.body;
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: { awsAccessKeyId, awsSecretAccessKey, awsRegion, awsS3Bucket, useS3Storage },
      create: { id: 'singleton', awsAccessKeyId, awsSecretAccessKey, awsRegion, awsS3Bucket, useS3Storage }
    });
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Randomly Map Mentors
// @route   POST /api/admin/random-map/mentors
// @access  Private/Admin
const randomMapMentors = async (req, res, next) => {
  try {
    const { pblId } = req.body;
    if (!pblId) throw new Error('PBL ID is required');

    const pbl = await prisma.pbl.findUnique({ 
      where: { id: pblId },
      include: { teams: true }
    });
    if (!pbl) throw new Error('PBL not found');

    const facultyList = await prisma.faculty.findMany({
      where: { pblFaculties: { some: { pblId } } }
    });
    if (facultyList.length === 0) throw new Error('No faculty available to assign.');

    let mentorAssignedCount = 0;

    await prisma.$transaction(async (tx) => {
      // Calculate current global load for each faculty
      const facultyLoads = await Promise.all(facultyList.map(async (faculty) => {
        const count = await tx.team.count({ where: { mentorId: faculty.id } });
        return { ...faculty, load: count };
      }));

      for (const team of pbl.teams) {
        // Sort by load (ascending), then shuffle ties to maintain some randomness
        facultyLoads.sort((a, b) => {
          if (a.load !== b.load) return a.load - b.load;
          return Math.random() - 0.5;
        });

        const assignedFaculty = facultyLoads[0];
        
        const mentorCount = await tx.team.count({
          where: { pblId, mentorId: assignedFaculty.id }
        });
        const runningNumber = String(mentorCount + 1).padStart(3, '0');
        const toRomanLocal = (num) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][num] || num;
        const mentorIdFormatted = `${pbl.subjectShort}-${toRomanLocal(pbl.semester)}-M-${runningNumber}`;

        await tx.team.update({
          where: { id: team.id },
          data: { mentorId: assignedFaculty.id, mentorIdFormatted }
        });
        
        // Increment load for next iteration
        facultyLoads[0].load++;
        mentorAssignedCount++;
      }
    });

    // Auto-enroll all available faculty in Moodle Course if configured
    if (pbl.moodleCourseId) {
      setTimeout(async () => {
        try {
          const facultiesToEnroll = await prisma.faculty.findMany({
            where: { pblFaculties: { some: { pblId } } },
            include: { user: true }
          });
          
          for (const faculty of facultiesToEnroll) {
            const moodleUsername = faculty.moodleId || faculty.user.email;
            await enrollUserInMoodleCourse(moodleUsername, pbl.moodleCourseId, 'teacher');
          }
        } catch (err) {
          console.error(`[MoodleSync] Error auto-enrolling random mentors in Moodle:`, err);
        }
      }, 0);
    }

    res.json({ message: `Successfully mapped ${mentorAssignedCount} mentors (equally balanced).` });
  } catch (error) {
    next(error);
  }
};

// @desc    Randomly Map Phase Evaluators
// @route   POST /api/admin/random-map/evaluators
// @access  Private/Admin
const randomMapEvaluators = async (req, res, next) => {
  try {
    const { pblId, phaseId } = req.body;
    if (!pblId || !phaseId) throw new Error('PBL ID and Phase ID are required');

    const pbl = await prisma.pbl.findUnique({ 
      where: { id: pblId },
      include: { teams: true }
    });
    if (!pbl) throw new Error('PBL not found');

    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase || phase.pblId !== pblId) throw new Error('Phase not found or does not belong to this PBL');

    const facultyList = await prisma.faculty.findMany({
      where: { pblFaculties: { some: { pblId } } }
    });
    if (facultyList.length === 0) throw new Error('No faculty available to assign.');

    let evaluatorAssignedCount = 0;

    await prisma.$transaction(async (tx) => {
      // Calculate current global load for each faculty
      const facultyLoads = await Promise.all(facultyList.map(async (faculty) => {
        const count = await tx.teamPhaseEvaluator.count({ where: { evaluatorId: faculty.id } });
        return { ...faculty, load: count };
      }));

      for (const team of pbl.teams) {
        // Filter out the mentor if there's more than 1 faculty available
        let eligibleFaculties = facultyLoads;
        if (facultyLoads.length > 1) {
          eligibleFaculties = facultyLoads.filter(f => f.id !== team.mentorId);
        }

        // Sort by load (ascending), then shuffle ties
        eligibleFaculties.sort((a, b) => {
          if (a.load !== b.load) return a.load - b.load;
          return Math.random() - 0.5;
        });

        const assignedFaculty = eligibleFaculties[0];

        await tx.teamPhaseEvaluator.upsert({
          where: {
            teamId_phaseId: {
              teamId: team.id,
              phaseId: phase.id
            }
          },
          update: { evaluatorId: assignedFaculty.id },
          create: {
            teamId: team.id,
            phaseId: phase.id,
            evaluatorId: assignedFaculty.id
          }
        });
        
        // Find this faculty in the main array and increment their load
        const facultyInMainArray = facultyLoads.find(f => f.id === assignedFaculty.id);
        if (facultyInMainArray) facultyInMainArray.load++;
        
        evaluatorAssignedCount++;
      }
    });

    res.json({ message: `Successfully mapped ${evaluatorAssignedCount} evaluators for Phase ${phase.phaseNumber} (equally balanced).` });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Evaluators to Teams per Phase
// @route   POST /api/admin/evaluator-mapping
// @access  Private/Admin
const assignEvaluators = async (req, res, next) => {
  try {
    const { pblId, assignments } = req.body; 
    // assignments: [{ teamId, phaseId, facultyId }]

    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) throw new Error('PBL not found');

    let assignedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        if (!assignment.facultyId) continue;
        const team = await tx.team.findUnique({ where: { id: assignment.teamId } });
        const phase = await tx.phase.findUnique({ where: { id: assignment.phaseId } });
        if (!team || !phase) continue;

        await tx.teamPhaseEvaluator.upsert({
          where: {
            teamId_phaseId: {
              teamId: team.id,
              phaseId: phase.id
            }
          },
          update: { evaluatorId: assignment.facultyId },
          create: {
            teamId: team.id,
            phaseId: phase.id,
            evaluatorId: assignment.facultyId
          }
        });
        assignedCount++;
      }
    });

    res.json({ message: `Successfully assigned ${assignedCount} evaluators.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Phase Configuration (Evaluation Criteria)
// @route   POST /api/admin/pbl/:id/phase-config
// @access  Private/Admin
const updatePhaseConfig = async (req, res, next) => {
  try {
    const { id: pblId } = req.params;
    const { phaseConfigs } = req.body; 
    // phaseConfigs: [{ phaseNumber: 1, instructions: "...", evaluationCriteria: [...] }, ...]

    if (!phaseConfigs || !Array.isArray(phaseConfigs)) {
      res.status(400);
      throw new Error('phaseConfigs array is required');
    }

    const { getMoodleAssignmentTimeline } = require('../services/moodleService');

    const updatedPhases = [];
    for (const config of phaseConfigs) {
      let submissionStart = null;
      let submissionEnd = null;

      if (config.moodleAssignmentId) {
        const timeline = await getMoodleAssignmentTimeline(config.moodleAssignmentId);
        if (timeline) {
          submissionStart = timeline.startDate;
          submissionEnd = timeline.dueDate;
        }
      }

      const phase = await prisma.phase.upsert({
        where: {
          pblId_phaseNumber: {
            pblId,
            phaseNumber: config.phaseNumber
          }
        },
        update: {
          instructions: config.instructions,
          evaluationCriteria: config.evaluationCriteria,
          moodleAssignmentId: config.moodleAssignmentId || null,
          ...(submissionStart && { submissionStart }),
          ...(submissionEnd && { submissionEnd })
        },
        create: {
          pblId,
          phaseNumber: config.phaseNumber,
          instructions: config.instructions,
          evaluationCriteria: config.evaluationCriteria,
          moodleAssignmentId: config.moodleAssignmentId || null,
          submissionStart,
          submissionEnd
        }
      });
      updatedPhases.push(phase);
    }

    res.json({ message: 'Phase configurations updated successfully', phases: updatedPhases });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually Update Team (Edit Members/Details)
// @route   PUT /api/admin/teams/:id
// @access  Private/Admin
const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customRegistrationData } = req.body;

    const team = await prisma.team.update({
      where: { id },
      data: { customRegistrationData }
    });

    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Team
// @route   DELETE /api/admin/teams/:id
// @access  Private/Admin
const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.team.delete({ where: { id } });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually Add Single Faculty
// @route   POST /api/admin/faculty
// @access  Private/Admin
  const addFaculty = async (req, res, next) => {
  try {
    const { name, email, department, pblId } = req.body;

    if (!name || !email) {
      res.status(400);
      throw new Error('Name and email are required');
    }
    if (!pblId) {
      res.status(400);
      throw new Error('pblId is required');
    }

    let facultyRecord;
    const existingUser = await prisma.user.findUnique({ where: { email }, include: { facultyProfile: true } });
    
    if (existingUser) {
      if (existingUser.role !== 'FACULTY' || !existingUser.facultyProfile) {
        res.status(400);
        throw new Error('User exists but is not a faculty');
      }
      facultyRecord = existingUser.facultyProfile;
    } else {
      const defaultPassword = await bcrypt.hash(email, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: defaultPassword,
          role: 'FACULTY',
          facultyProfile: {
            create: { department: department || 'General' }
          }
        },
        include: { facultyProfile: true }
      });
      facultyRecord = user.facultyProfile;
    }

    if (facultyRecord) {
      await assignPblFacultyIds(pblId, facultyRecord.id);
    }

    res.status(201).json({ message: 'Faculty added successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Faculty
// @route   GET /api/admin/faculty
// @access  Private/Admin
const getAllFaculty = async (req, res, next) => {
  try {
    const { pblId } = req.query;
    const whereClause = pblId ? { pblFaculties: { some: { pblId } } } : {};

    const faculty = await prisma.faculty.findMany({
      where: whereClause,
      include: { user: true, pblFaculties: true }
    });
    res.json(faculty);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Teams for a PBL
// @route   GET /api/admin/teams/:pblId
// @access  Private/Admin
const getTeamsForPbl = async (req, res, next) => {
  try {
    const { pblId } = req.params;
    const teams = await prisma.team.findMany({
      where: { pblId },
      include: {
        leader: { include: { user: true } },
        mentor: { include: { user: true, pblFaculties: { where: { pblId } } } },
        phaseEvaluators: { include: { evaluator: { include: { user: true, pblFaculties: { where: { pblId } } } }, phase: true } },
        members: { include: { student: { include: { user: true } } } }
      }
    });
    res.json(teams);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Marks for a PBL per Phase
// @route   GET /api/admin/reports/marks/:pblId
// @access  Private/Admin
const getMarksForPbl = async (req, res, next) => {
  try {
    const { pblId } = req.params;
    
    const teams = await prisma.team.findMany({
      where: { pblId },
      include: {
        leader: { include: { user: true } },
        mentor: { include: { user: true } },
        phaseEvaluators: { include: { evaluator: { include: { user: true } }, phase: true } },
        members: { include: { student: { include: { user: true } } } },
        submissions: { include: { mentorGrades: { orderBy: { gradedAt: 'desc' } }, phase: true } },
        examineeAssignments: { include: { evaluations: true, phase: true } }
      }
    });

    const evaluations = await prisma.evaluation.findMany({
      where: { phase: { pblId } },
      include: { phase: true, evaluator: { include: { user: true } } }
    });

    const structuredData = [];

    teams.forEach(team => {
      team.members.forEach(member => {
        const student = member.student;
        
        const studentData = {
          studentId: student.id,
          name: student.user.name,
          enrollmentNumber: student.enrollmentNumber,
          section: student.section,
          teamIdFormatted: team.teamIdFormatted,
          leaderName: team.leader?.user?.name || 'N/A',
          mentorName: team.mentor?.user?.name || 'Unassigned',
          projectLevel: team.projectLevel || 'N/A',
          phases: {}
        };
        
        const phaseRecords = team.phaseEvaluators.map(pe => pe.phase);
        
        [1, 2, 3].forEach(phaseNum => {
          const matchedPhase = phaseRecords.find(p => p.phaseNumber === phaseNum);
          const matchedEvaluator = team.phaseEvaluators.find(pe => pe.phase.phaseNumber === phaseNum);
          studentData.phases[phaseNum] = {
            phaseId: matchedPhase ? matchedPhase.id : null,
            evaluatorId: matchedEvaluator ? matchedEvaluator.evaluatorId : null,
            mentorGrade: null,
            mentorRemarks: null,
            evaluatorTotalMarks: null,
            evaluatorMarksData: {},
            evaluatorRemarks: null,
            microMentorScore: null
          };
        });

        team.submissions.forEach(sub => {
          const pNum = sub.phase.phaseNumber;
          if (sub.mentorGrades && sub.mentorGrades.length > 0) {
             const latestGrade = sub.mentorGrades[0];
             studentData.phases[pNum].mentorGrade = latestGrade.grade;
             studentData.phases[pNum].mentorRemarks = latestGrade.remarks;
          }
        });

        // Add Micro Mentor Data
        if (team.examineeAssignments) {
          team.examineeAssignments.forEach(assignment => {
            const pNum = assignment.phase.phaseNumber;
            const evals = assignment.evaluations;
            if (evals && evals.length > 0) {
              const avg = (evals.reduce((sum, ev) => sum + ev.totalMarks, 0) / evals.length).toFixed(2);
              studentData.phases[pNum].microMentorScore = avg;
            }
          });
        }

        const studentEvals = evaluations.filter(e => e.studentId === student.id);
        studentEvals.forEach(ev => {
          const pNum = ev.phase.phaseNumber;
          studentData.phases[pNum].evaluatorTotalMarks = ev.totalMarks;
          studentData.phases[pNum].evaluatorMarksData = ev.marksData || {};
        });

        team.phaseEvaluators.forEach(pe => {
           const pNum = pe.phase.phaseNumber;
           if (pe.remarks) {
             studentData.phases[pNum].evaluatorRemarks = pe.remarks;
           }
        });

        structuredData.push(studentData);
      });
    });

    res.json(structuredData);
  } catch (error) {
    next(error);
  }
};
// @desc    Admin Manually Creates a Team
// @route   POST /api/admin/teams
// @access  Private/Admin
const createTeamAdmin = async (req, res, next) => {
  try {
    const { pblId, members } = req.body;
    // members is an array of objects: { rollNo, section }

    if (!pblId) throw new Error('PBL ID is required');
    if (!members || members.length < 1 || members.length > 4) {
      res.status(400);
      throw new Error('Team size must be between 1 and 4 members.');
    }

    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) {
      res.status(404);
      throw new Error('PBL not found.');
    }

    // Process Members (including Leader at index 0)
    const studentsData = await Promise.all(
      members.map(async (m) => {
        let student = await prisma.student.findFirst({
          where: { 
            enrollmentNumber: m.rollNo,
            section: { equals: m.section, mode: 'insensitive' }
          }
        });

        if (!student) {
          // Verify if student exists in another section
          const wrongSectionStudent = await prisma.student.findFirst({
             where: { enrollmentNumber: m.rollNo }
          });
          if (wrongSectionStudent) {
             throw new Error(`Roll No ${m.rollNo} exists but is registered in Section ${wrongSectionStudent.section}.`);
          }

          // Create dummy user and student
          const dummyUser = await prisma.user.create({
            data: {
              email: `dummy_${m.rollNo}@dummy.geu.ac.in`,
              name: `Student ${m.rollNo}`,
              passwordHash: 'dummy',
              role: 'STUDENT',
              isVerified: false,
              studentProfile: {
                create: {
                  enrollmentNumber: m.rollNo,
                  section: m.section.toUpperCase()
                }
              }
            },
            include: { studentProfile: true }
          });
          student = dummyUser.studentProfile;
        }
        return student;
      })
    );

    const memberIds = studentsData.map(s => s.id);

    // Check if any member is already in a team for this PBL
    const existingMembers = await prisma.teamMember.findMany({
      where: {
        studentId: { in: memberIds },
        team: { pblId: pblId }
      },
      include: { student: { include: { user: true } } }
    });

    if (existingMembers.length > 0) {
      res.status(400);
      throw new Error(`One or more students are already in a team for this PBL.`);
    }

    // Note: Admin can manually create teams with members from the same section as per requirements.

    // Generate Team ID
    const teamCount = await prisma.team.count({ where: { pblId } });
    const runningNumber = String(teamCount + 1).padStart(3, '0');
    const toRoman = (num) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][num] || num;
    const romanSem = toRoman(pbl.semester);
    const teamIdFormatted = `${pbl.subjectShort}-${romanSem}-T${runningNumber}`;

    // Create Team and Team Members in transaction
    const newTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          pblId,
          teamIdFormatted,
          leaderId: memberIds[0], // First member is leader
          members: {
            create: memberIds.map(studentId => ({ studentId }))
          }
        },
        include: { 
          members: { include: { student: { include: { user: true } } } },
          pbl: true
        }
      });
      return team;
    });

    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    next(error);
  }
};

// @desc    Hard Delete PBL
// @route   DELETE /api/admin/pbl/hard/:id
// @access  Private/Admin
const deletePbl = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.pbl.delete({ where: { id } });
    res.json({ message: 'PBL has been permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete teams
// @route   POST /api/admin/teams/bulk-delete
// @access  Private/Admin
const bulkDeleteTeams = async (req, res, next) => {
  try {
    const { teamIds } = req.body;
    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of team IDs');
    }

    // Prisma doesn't cascade cleanly for some relations if not setup, 
    // but assuming teamMembers delete cascades. If not, delete them first.
    await prisma.teamMember.deleteMany({
      where: { teamId: { in: teamIds } }
    });

    await prisma.team.deleteMany({
      where: { id: { in: teamIds } }
    });

    res.json({ message: `${teamIds.length} teams deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload Teams from Excel
// @route   POST /api/admin/pbl/:pblId/teams/bulk
// @access  Private/Admin
const bulkUploadTeams = async (req, res, next) => {
  try {
    const pblId = req.params.pblId;
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel file');
    }

    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) {
      res.status(404);
      throw new Error('PBL Subject not found');
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let addedTeamsCount = 0;
    let skippedRows = [];

    // Helper to get or create student
    const getOrCreateStudent = async (rollNo, email, name, section, semester) => {
      if (!rollNo) return null;
      rollNo = String(rollNo).trim();
      email = email ? String(email).trim() : `${rollNo}@geu.ac.in`;
      name = name ? String(name).trim() : rollNo;
      section = section ? String(section).toUpperCase().trim() : 'A';
      semester = semester ? parseInt(semester) : pbl.semester;

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { studentProfile: { enrollmentNumber: rollNo } }
          ]
        },
        include: { studentProfile: true }
      });

      if (!user) {
        const passwordHash = await bcrypt.hash('Moodle@123', 10);
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'STUDENT',
            requiresPasswordChange: true,
            studentProfile: {
              create: {
                enrollmentNumber: rollNo,
                moodleId: rollNo,
                section,
                semester
              }
            }
          },
          include: { studentProfile: true }
        });
      } else if (!user.studentProfile) {
        return null;
      }
      return user.studentProfile;
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +1 for 0-index, +1 for header

      const leaderRollNo = row['Team Lead University Roll Number'] || row['Team Lead Student ID'];
      const leaderName = row['Team Lead Name'];
      const leaderEmail = row['Team Lead Email ID'];
      const leaderSection = row['Section of Team Lead'];
      const semester = row['Semester'];

      if (!leaderRollNo) {
        skippedRows.push(`Row ${rowNumber}: Missing Team Leader Roll Number`);
        continue;
      }

      const rawMembers = [
        { rollNo: leaderRollNo, name: leaderName, email: leaderEmail, section: leaderSection }
      ];

      for (let m = 1; m <= 4; m++) {
        const mRollNo = row[`University Roll Number Member ${m}`] || row[`Student ID Member ${m}`] || row[`StudentID of Member ${m}`];
        const mName = row[`Name of Member ${m}`];
        const mEmail = row[`Email ID Member ${m}`];
        const mSection = row[`Section of Member ${m}`];

        if (mRollNo) {
          rawMembers.push({ rollNo: mRollNo, name: mName, email: mEmail, section: mSection });
        }
      }

      // 1. Process sections to remove duplicate sections within the team
      const seenSections = new Set();
      const validMembers = [];

      for (const m of rawMembers) {
        const sec = m.section ? String(m.section).toUpperCase().trim() : 'A';
        if (!seenSections.has(sec)) {
          seenSections.add(sec);
          validMembers.push(m);
        }
      }

      // 2. Fetch or create student profiles for valid members
      const processedMembers = [];

      for (const m of validMembers) {
        const studentProfile = await getOrCreateStudent(m.rollNo, m.email, m.name, m.section, semester);
        if (!studentProfile) continue;

        // Ensure student is not already in a team for this PBL
        const existingTeamMember = await prisma.teamMember.findFirst({
          where: { studentId: studentProfile.id, team: { pblId: pbl.id } }
        });

        if (!existingTeamMember) {
          processedMembers.push(studentProfile);
        }
      }

      if (processedMembers.length === 0) {
        skippedRows.push(`Row ${rowNumber}: All members were either invalid or already in a team for this subject.`);
        continue;
      }

      // 3. Create Team
      const leaderStudentId = processedMembers[0].id;
      
      const newTeam = await prisma.team.create({
        data: {
          pblId: pbl.id,
          leaderId: leaderStudentId
        }
      });

      // 4. Add members
      const teamMembersData = processedMembers.map(sp => ({
        teamId: newTeam.id,
        studentId: sp.id
      }));

      await prisma.teamMember.createMany({
        data: teamMembersData
      });

      addedTeamsCount++;
    }

    res.json({ 
      message: `Successfully created ${addedTeamsCount} teams.`,
      skipped: skippedRows
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Add Member to existing Team
// @route   POST /api/admin/teams/:id/members
// @access  Private/Admin
const addTeamMemberAdmin = async (req, res, next) => {
  try {
    const { id: teamId } = req.params;
    const { rollNo, section } = req.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error('Team not found');

    // Find or create student
    let student = await prisma.student.findUnique({ where: { enrollmentNumber: rollNo } });
    if (!student) {
      const defaultPassword = await bcrypt.hash('dummy', 10);
      const user = await prisma.user.create({
        data: {
          name: `Student ${rollNo}`,
          email: `dummy_${rollNo}@dummy.geu.ac.in`,
          passwordHash: defaultPassword,
          role: 'STUDENT',
          studentProfile: {
            create: { enrollmentNumber: rollNo, section }
          }
        },
        include: { studentProfile: true }
      });
      student = user.studentProfile;
    }

    // Check if student is already in a team for this PBL
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        studentId: student.id,
        team: { pblId: team.pblId }
      }
    });

    if (existingMember) {
      res.status(400);
      throw new Error(`Student ${rollNo} is already in a team for this PBL.`);
    }

    // Add to team
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        studentId: student.id
      }
    });

    res.json({ message: 'Member added successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove Member from Team
// @route   DELETE /api/admin/teams/:id/members/:studentId
// @access  Private/Admin
const removeTeamMemberAdmin = async (req, res, next) => {
  try {
    const { id: teamId, studentId } = req.params;

    const team = await prisma.team.findUnique({ 
      where: { id: teamId },
      include: { members: true }
    });
    if (!team) throw new Error('Team not found');

    if (team.leaderId === studentId) {
      res.status(400);
      throw new Error('Cannot remove the team leader. Please delete the entire team instead.');
    }

    await prisma.teamMember.delete({
      where: {
        teamId_studentId: {
          teamId,
          studentId
        }
      }
    });

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
};


// @desc    Auto-form teams for remaining students
// @route   POST /api/admin/pbl/:pblId/auto-form-teams
// @access  Private/Admin
const autoFormTeams = async (req, res, next) => {
  try {
    const { pblId } = req.params;
    
    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) {
      res.status(404);
      throw new Error('PBL not found');
    }

    if (pbl.teamFormationEnd && new Date() <= pbl.teamFormationEnd) {
      res.status(400);
      throw new Error('Cannot auto-form teams before the Team Formation Deadline has passed.');
    }

    let unassignedStudents = [];

    if (pbl.moodleCourseId) {
      const { getMoodleCourseUsers } = require('../services/moodleService');
      const moodleUsernames = await getMoodleCourseUsers(pbl.moodleCourseId);
      
      if (moodleUsernames && moodleUsernames.length > 0) {
        unassignedStudents = await prisma.student.findMany({
          where: {
            OR: [
              { moodleId: { in: moodleUsernames } },
              { enrollmentNumber: { in: moodleUsernames } }
            ],
            teamMembers: {
              none: {
                team: { pblId }
              }
            }
          }
        });
      }
    }

    // Fallback: If Moodle is not used or API fails, grab unassigned students based on the PBL's semester.
    if (unassignedStudents.length === 0) {
      unassignedStudents = await prisma.student.findMany({
        where: {
          semester: pbl.semester,
          teamMembers: {
            none: {
              team: { pblId }
            }
          }
        }
      });
    }

    if (unassignedStudents.length === 0) {
      let reason = pbl.moodleCourseId 
        ? `Moodle course is linked, but no available students were found (check Moodle enrollment or API connection).`
        : `System looked for students in Semester ${pbl.semester}, but found none available.`;
      return res.status(400).json({ message: `No unassigned students found for this PBL. Reason: ${reason}` });
    }

    for (let i = unassignedStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unassignedStudents[i], unassignedStudents[j]] = [unassignedStudents[j], unassignedStudents[i]];
    }

    let chunkSizes = [];
    const N = unassignedStudents.length;

    if (N <= 4) {
      chunkSizes.push(N);
    } else if (N === 5) {
      chunkSizes.push(3, 2);
    } else {
      let found = false;
      for (let numFours = Math.floor(N / 4); numFours >= 0; numFours--) {
        let remainder = N - (numFours * 4);
        if (remainder % 3 === 0) {
          let numThrees = remainder / 3;
          for (let i = 0; i < numFours; i++) chunkSizes.push(4);
          for (let i = 0; i < numThrees; i++) chunkSizes.push(3);
          found = true;
          break;
        }
      }
      if (!found) chunkSizes = [N];
    }

    let createdTeamsCount = 0;
    
    const existingTeams = await prisma.team.findMany({
      where: { pblId },
      orderBy: { createdAt: 'desc' }
    });
    let seqNumber = existingTeams.length;

    let currentIndex = 0;
    for (const size of chunkSizes) {
      const chunk = unassignedStudents.slice(currentIndex, currentIndex + size);
      currentIndex += size;
      
      seqNumber++;
      const seqStr = String(seqNumber).padStart(3, '0');
      const romanSem = toRoman(pbl.semester);
      const teamIdFormatted = `${pbl.subjectShort}-${romanSem}-T${seqStr}`;

      const leader = chunk[0];

      await prisma.team.create({
        data: {
          pblId,
          teamIdFormatted,
          leaderId: leader.id,
          members: {
            create: chunk.map(student => ({
              studentId: student.id
            }))
          }
        }
      });
      createdTeamsCount++;
    }

    res.json({ message: `Successfully formed ${createdTeamsCount} teams for ${unassignedStudents.length} remaining students.` });

  } catch (error) {
    next(error);
  }
};

// @desc    Unlock absent student for re-evaluation
// @route   POST /api/admin/re-evaluation/unlock
// @access  Private/Admin
const unlockForReevaluation = async (req, res, next) => {
  try {
    const { studentId, phaseId, evaluatorId } = req.body;
    
    if (!studentId || !phaseId || !evaluatorId) {
      res.status(400);
      throw new Error('Please provide studentId, phaseId, and evaluatorId');
    }

    // Check if there is an existing Evaluation
    const oldEvaluations = await prisma.evaluation.findMany({
      where: { studentId, phaseId }
    });

    if (oldEvaluations.length > 0) {
      // Delete old evaluation(s) for this phase to clear the slate
      await prisma.evaluation.deleteMany({
        where: { studentId, phaseId }
      });
    }

    // Upsert the reevaluation assignment
    const reeval = await prisma.reevaluationAssignment.upsert({
      where: { studentId_phaseId: { studentId, phaseId } },
      update: { evaluatorId, status: 'PENDING' },
      create: { studentId, phaseId, evaluatorId, status: 'PENDING' }
    });

    res.json({ message: 'Student unlocked for re-evaluation successfully', reevaluation: reeval });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk assign re-evaluation from Excel
// @route   POST /api/admin/re-evaluation/bulk
// @access  Private/Admin
const bulkReevaluation = async (req, res, next) => {
  try {
    const { phaseId, evaluatorId } = req.body;
    if (!phaseId || !evaluatorId) {
      res.status(400);
      throw new Error('phaseId and evaluatorId are required');
    }
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel file');
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Extract enrollment numbers from the first column (any header name)
    const enrollmentNumbers = rows.map(r => {
      const firstKey = Object.keys(r)[0];
      return String(r[firstKey]).trim();
    }).filter(Boolean);

    if (enrollmentNumbers.length === 0) {
      res.status(400);
      throw new Error('No enrollment numbers found in the Excel file');
    }

    // Find matching students
    const students = await prisma.student.findMany({
      where: { enrollmentNumber: { in: enrollmentNumbers } },
      select: { id: true, enrollmentNumber: true }
    });

    const foundEnrollments = students.map(s => s.enrollmentNumber);
    const notFound = enrollmentNumbers.filter(e => !foundEnrollments.includes(e));

    let created = 0;
    let updated = 0;

    for (const student of students) {
      // Delete old evaluations for this student+phase
      await prisma.evaluation.deleteMany({
        where: { studentId: student.id, phaseId }
      });

      // Upsert re-evaluation assignment
      const existing = await prisma.reevaluationAssignment.findUnique({
        where: { studentId_phaseId: { studentId: student.id, phaseId } }
      });

      if (existing) {
        await prisma.reevaluationAssignment.update({
          where: { id: existing.id },
          data: { evaluatorId, status: 'PENDING' }
        });
        updated++;
      } else {
        await prisma.reevaluationAssignment.create({
          data: { studentId: student.id, phaseId, evaluatorId, status: 'PENDING' }
        });
        created++;
      }
    }

    res.json({
      message: `Bulk re-evaluation processed successfully`,
      created,
      updated,
      total: students.length,
      notFound
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all re-evaluation assignments for a phase
// @route   GET /api/admin/re-evaluation/list/:phaseId
// @access  Private/Admin
const getReevaluations = async (req, res, next) => {
  try {
    const { phaseId } = req.params;
    const reevals = await prisma.reevaluationAssignment.findMany({
      where: { phaseId },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        evaluator: { include: { user: { select: { name: true, email: true } } } },
        phase: { select: { phaseNumber: true, pblId: true } }
      },
      orderBy: { student: { enrollmentNumber: 'asc' } }
    });
    res.json(reevals);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin update evaluation marks directly
// @route   PUT /api/admin/reports/marks/update
// @access  Private/Admin
const adminUpdateMarks = async (req, res, next) => {
  try {
    const { studentId, phaseId, totalMarks, marksData } = req.body;
    if (!studentId || !phaseId || totalMarks === undefined) {
      res.status(400);
      throw new Error('Please provide studentId, phaseId, and marks details');
    }
    
    let evaluation = await prisma.evaluation.findUnique({
      where: { studentId_phaseId: { studentId, phaseId } }
    });

    if (!evaluation) {
      res.status(404);
      throw new Error('Evaluation not found. Evaluator must grade first or it must exist.');
    }

    evaluation = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: {
        totalMarks: Number(totalMarks),
        marksData: marksData || evaluation.marksData
      }
    });

    res.json({ message: 'Marks updated successfully', evaluation });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Micro Mentors (Peer Evaluation) Randomly
// @route   POST /api/admin/micro-mentor/assign
// @access  Private/Admin
const assignMicroMentors = async (req, res, next) => {
  try {
    const { pblId, phaseId } = req.body;
    
    // Check Phase
    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase) throw new Error('Phase not found');

    // Find all teams that have a submission for this phase
    const submissions = await prisma.submission.findMany({
      where: { 
        phaseId,
        team: { pblId }
      },
      include: { team: true }
    });

    if (submissions.length < 2) {
      throw new Error('Need at least 2 teams with submissions in this phase to assign peer reviews.');
    }

    // Delete existing micro mentor assignments for this phase to re-assign
    await prisma.microMentorAssignment.deleteMany({
      where: { phaseId }
    });

    // Shuffle the teams array
    let teams = submissions.map(sub => sub.team);
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    // Shift by 1 to assign Reviewer -> Examinee
    // A -> B, B -> C, C -> A
    let assignments = [];
    for (let i = 0; i < teams.length; i++) {
      const reviewerTeam = teams[i];
      const examineeTeam = teams[(i + 1) % teams.length]; // Next team in shuffled list

      assignments.push({
        phaseId,
        reviewerTeamId: reviewerTeam.id,
        examineeTeamId: examineeTeam.id
      });
    }

    await prisma.microMentorAssignment.createMany({
      data: assignments
    });

    res.json({ message: `Successfully assigned ${assignments.length} teams for peer evaluation.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Micro Mentor Assignments for a PBL
// @route   GET /api/admin/micro-mentor/:pblId
// @access  Private/Admin
const getMicroMentorAssignments = async (req, res, next) => {
  try {
    const { pblId } = req.params;
    const { phaseId } = req.query; // optional filter

    let whereClause = {
      reviewerTeam: { pblId }
    };
    if (phaseId) {
      whereClause.phaseId = phaseId;
    }

    const assignments = await prisma.microMentorAssignment.findMany({
      where: whereClause,
      include: {
        phase: true,
        reviewerTeam: { include: { leader: { include: { user: true } } } },
        examineeTeam: { include: { leader: { include: { user: true } } } },
        evaluations: true
      }
    });

    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeamAdmin,
  createPbl,
  getPbls,
  updatePbl,
  archivePbl,
  deletePbl,
  updatePblTimeline,
  updatePhaseTimeline,
  uploadFaculty,
  bulkUploadFaculty,
  bulkUploadStudents,
  assignMentors,
  assignEvaluators,
  randomMapMentors,
  randomMapEvaluators,
  updatePhaseConfig,
  updateTeam,
  deleteTeam,
  addTeamMemberAdmin,
  removeTeamMemberAdmin,
  addFaculty,
  getAllFaculty,
  getTeamsForPbl,
  getMarksForPbl,
  adminUpdateMarks,
  downloadReport,
  resetUserPassword,
  getDashboardStats,
  getSettings,
  updateSettings,
  getAllStudents,
  autoFormTeams,
  unlockForReevaluation,
  bulkReevaluation,
  getReevaluations,
  adminUpdateMarks,
  getAllStudents,
  bulkDeleteTeams,
  bulkUploadTeams,
  assignMicroMentors,
  getMicroMentorAssignments
};
