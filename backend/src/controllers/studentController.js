const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const { enrollUserInMoodleCourse } = require('../services/moodleService');

// @desc    Create a Team
// @route   POST /api/student/team
// @access  Private/Student
const createTeam = async (req, res, next) => {
  try {
    const { pblId, members, customRegistrationData } = req.body;
    // members is an array of objects: { rollNo, section }

    if (!members || members.length < 3 || members.length > 4) {
      res.status(400);
      throw new Error('Team size must be between 3 and 4 members.');
    }

    const leaderInfo = members[0];
    const otherMembersInfo = members.slice(1);

    // 1. Process Team Leader
    const currentStudentId = req.user.studentProfileId;
    let currentStudent = await prisma.student.findUnique({ where: { id: currentStudentId } });
    
    if (currentStudent.enrollmentNumber.startsWith('TEMP_')) {
      // Check if the Roll No they entered is already taken by a dummy account
      const existingDummy = await prisma.student.findFirst({
         where: { enrollmentNumber: leaderInfo.rollNo },
         include: { user: true }
      });

      if (existingDummy) {
         if (existingDummy.user.email.startsWith('dummy_')) {
             // It's a dummy! Delete the dummy User (which cascades and deletes the Student record)
             await prisma.user.delete({ where: { id: existingDummy.userId } });
         } else {
             res.status(400);
             throw new Error(`Roll No ${leaderInfo.rollNo} is already registered by another verified user.`);
         }
      }

      // Update current student with real Roll No and Section
      currentStudent = await prisma.student.update({
         where: { id: currentStudentId },
         data: { enrollmentNumber: leaderInfo.rollNo, section: leaderInfo.section.toUpperCase() }
      });
    } else {
       // Validate that the first member they entered is their actual Roll No!
       if (currentStudent.enrollmentNumber !== leaderInfo.rollNo) {
           res.status(400);
           throw new Error(`The first Roll No must be your own (${currentStudent.enrollmentNumber}).`);
       }
    }

    if (leaderInfo.name) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name: leaderInfo.name }
      });
    }

    // 2. Process Other Members
    const otherStudentsData = await Promise.all(
      otherMembersInfo.map(async (m) => {
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

          // Check if provided email is already used by another user
          if (m.email) {
            if (!m.email.toLowerCase().endsWith('@geu.ac.in')) {
              throw new Error(`The email address ${m.email} must belong to the @geu.ac.in domain.`);
            }
            const existingEmailUser = await prisma.user.findUnique({ where: { email: m.email } });
            if (existingEmailUser) {
              throw new Error(`The email address ${m.email} is already registered. Please check the email or have the user create their own account.`);
            }
          }

          // Create dummy user and student
          const defaultPassword = await bcrypt.hash(m.email || `dummy_${m.rollNo}@dummy.geu.ac.in`, 10);
          const dummyUser = await prisma.user.create({
            data: {
              email: m.email || `dummy_${m.rollNo}@dummy.geu.ac.in`,
              name: m.name || `Student ${m.rollNo}`,
              passwordHash: defaultPassword,
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

    const studentsData = [currentStudent, ...otherStudentsData];
    const memberIds = studentsData.map(s => s.id);

    const pbl = await prisma.pbl.findUnique({ where: { id: pblId } });
    if (!pbl) {
      res.status(404);
      throw new Error('PBL not found.');
    }

    const now = new Date();
    if (pbl.teamFormationStart && now < pbl.teamFormationStart) {
      res.status(400);
      throw new Error('Team formation has not started yet.');
    }
    if (pbl.teamFormationEnd && now > pbl.teamFormationEnd) {
      res.status(400);
      throw new Error('Team formation deadline has passed.');
    }

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

    // Check section rule: No two members in a student-formed team can be from the same section
    const sections = new Set(studentsData.map(s => s.section.toUpperCase()));
    if (sections.size < studentsData.length) {
      res.status(400);
      throw new Error('No two members can be from the same section. Every team member must belong to a different section!');
    }

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
          leaderId: req.user.studentProfileId,
          customRegistrationData,
          members: {
            create: memberIds.map(studentId => ({ 
              studentId,
              status: 'ACCEPTED'
            }))
          }
        },
        include: { 
          members: { include: { student: { include: { user: true } } } },
          pbl: true
        }

      });
      return team;
    });

    // Auto-enroll in Moodle Course if configured
    if (pbl.moodleCourseId) {
      setTimeout(async () => {
        try {
          for (const sData of studentsData) {
            const moodleUsername = sData.moodleId || sData.enrollmentNumber;
            await enrollUserInMoodleCourse(moodleUsername, pbl.moodleCourseId, 'student');
          }
        } catch (err) {
          console.error(`[MoodleSync] Error auto-enrolling team ${newTeam.teamIdFormatted} in Moodle:`, err);
        }
      }, 0);
    }

    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student's teams
// @route   GET /api/student/team/my-team
// @access  Private/Student
const getMyTeam = async (req, res, next) => {
  try {
    const studentId = req.user.studentProfileId;

    const teamMembers = await prisma.teamMember.findMany({
      where: { studentId, status: { in: ['ACCEPTED', 'REMOVAL_REQUESTED'] } },
      include: {
        team: {
          include: {
            pbl: { include: { phases: true } },
            mentor: { include: { user: true } },
            phaseEvaluators: { include: { evaluator: { include: { user: true } }, phase: true } },
            members: { include: { student: { include: { user: true } } } },
            submissions: true
          }
        }
      }
    });

    const myTeams = teamMembers.map(tm => tm.team);
    res.json(myTeams);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Submission for a specific phase
// @route   GET /api/student/team/:teamId/phase/:phaseNumber
// @access  Private/Student
const getSubmissionForPhase = async (req, res, next) => {
  try {
    const { teamId, phaseNumber } = req.params;
    const team = await prisma.team.findUnique({ where: { id: teamId }, include: { pbl: true } });
    if (!team) throw new Error("Team not found");

    const phase = await prisma.phase.findUnique({
      where: {
        pblId_phaseNumber: {
          pblId: team.pblId,
          phaseNumber: parseInt(phaseNumber)
        }
      }
    });

    if (!phase) {
      return res.json(null); // Phase config doesn't exist yet
    }

    const submission = await prisma.submission.findFirst({
      where: { teamId, phaseId: phase.id },
      include: { mentorGrades: true }
    });

    res.json(submission);
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Phase Synopsis/Files via URL
// @route   POST /api/student/phase
// @access  Private/Student
const submitPhase = async (req, res, next) => {
  try {
    const { teamId, phaseNumber, fileUrls } = req.body; // synopsisUrl removed from body if using file upload
    const studentId = req.user.studentProfileId;
    let providedSynopsisUrl = req.body.synopsisUrl;

    if (req.file) {
      if (req.uploadType === 'S3') {
        providedSynopsisUrl = req.file.location;
      } else {
        providedSynopsisUrl = `${req.protocol}://${req.get('host')}/uploads/documents/${req.file.filename}`;
      }
    }

    if (!providedSynopsisUrl) {
       res.status(400);
       throw new Error('Please provide a Synopsis Document URL or upload a file.');
    }

    // Check if team leader
    let whereClause = { leaderId: studentId };
    if (teamId) {
      whereClause.id = teamId;
    }
    
    const team = await prisma.team.findFirst({
      where: whereClause,
      include: { pbl: true }
    });

    if (!team || team.leaderId !== studentId) {
      res.status(403);
      throw new Error('Only the Team Leader of this specific team can submit phase documents.');
    }

    const phase = await prisma.phase.findUnique({
      where: {
        pblId_phaseNumber: {
          pblId: team.pblId,
          phaseNumber: parseInt(phaseNumber)
        }
      }
    });

    if (!phase) {
      res.status(400);
      throw new Error(`Phase ${phaseNumber} configuration is not set up by Admin yet.`);
    }

    const now = new Date();
    if (phase.submissionStart && now < new Date(phase.submissionStart)) {
      res.status(400);
      throw new Error(`Submission for Phase ${phaseNumber} has not started yet.`);
    }
    if (phase.submissionEnd && now > new Date(phase.submissionEnd)) {
      res.status(400);
      throw new Error(`Submission deadline for Phase ${phaseNumber} has passed.`);
    }

    const existingSubmission = await prisma.submission.findFirst({
      where: { teamId: team.id, phaseId: phase.id }
    });

    let submission;
    if (existingSubmission) {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          synopsisUrl: providedSynopsisUrl,
          fileUrls,
          status: 'PENDING',
          submittedAt: new Date()
        }
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          teamId: team.id,
          phaseId: phase.id,
          synopsisUrl: providedSynopsisUrl,
          fileUrls,
          status: 'PENDING'
        }
      });
    }

    res.status(201).json({ message: 'Submission successful', submission });

    // Background sync to Moodle if phase is linked to Moodle Assignment
    // As per Option 1, we NO LONGER upload the file to Moodle. 
    // The file stays on the PBL portal. We only sync the grade later.
    /*
    if (phase.moodleAssignmentId) {
      const studentProfile = await prisma.student.findUnique({ where: { id: studentId } });
      const moodleIdToUse = studentProfile?.moodleId || studentProfile?.enrollmentNumber;
      if (moodleIdToUse) {
        const { uploadFileToMoodle } = require('../services/moodleService');
        uploadFileToMoodle(moodleIdToUse, phase.moodleAssignmentId, providedSynopsisUrl).catch(err => {
          console.error('Non-blocking Moodle upload error:', err);
        });
      }
    }
    */

  } catch (error) {
    next(error);
  }
};

// @desc    Get Active PBLs for team formation
// @route   GET /api/student/pbls
// @access  Private/Student
const getActivePbls = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: { semester: true, moodleId: true, enrollmentNumber: true }
    });

    const pbls = await prisma.pbl.findMany({
      where: { 
        isArchived: false
      },
      include: { phases: true }
    });

    let filteredPbls = pbls;
    let moodleDebug = 'Not checked';

    if (student) {
      const { getUserMoodleCourses } = require('../services/moodleService');
      const moodleUsername = student.moodleId || student.enrollmentNumber;
      
      try {
        const moodleCourses = await getUserMoodleCourses(moodleUsername);
        
        if (moodleCourses !== null) {
          moodleDebug = `Moodle active. Courses found: ${moodleCourses.join(', ')}`;
          filteredPbls = pbls.filter(pbl => {
            if (pbl.moodleCourseId) {
              return moodleCourses.includes(String(pbl.moodleCourseId));
            }
            return true; // Show unmapped PBLs to everyone
          });
        } else {
          moodleDebug = 'Moodle API returned null (User not found or Token error). Showing all unmapped PBLs.';
          filteredPbls = pbls.filter(pbl => !pbl.moodleCourseId); // Hide mapped ones if Moodle fails? No, show all!
          // Actually, if Moodle fails, just show ALL PBLs so they can at least use the platform.
          filteredPbls = pbls;
        }
      } catch (err) {
        moodleDebug = `Error: ${err.message}`;
        filteredPbls = pbls; // Fallback: show everything if Moodle crashes
      }
    }

    res.json({
      pbls: filteredPbls,
      moodleDebug
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student details by roll number
// @route   GET /api/student/by-roll/:rollNo
// @access  Private/Student
const getStudentByRoll = async (req, res, next) => {
  try {
    const { rollNo } = req.params;
    const student = await prisma.student.findUnique({
      where: { enrollmentNumber: rollNo },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!student) {
      res.status(404);
      throw new Error(`Student with Roll No ${rollNo} not found in database.`);
    }

    res.json({
      rollNo: student.enrollmentNumber,
      section: student.section,
      name: student.user.name,
      email: student.user.email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite a member to a team
// @route   POST /api/student/team/invite
// @access  Private/Student
const inviteMember = async (req, res, next) => {
  try {
    const { teamId, rollNo, section, name, email } = req.body;
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { pbl: true, members: { include: { student: true } } }
    });

    if (!team) throw new Error('Team not found');
    if (team.leaderId !== req.user.studentProfileId) throw new Error('Only the team leader can invite members.');
    if (team.members.length >= 4) throw new Error('Team is already full (max 4 members).');
    
    if (team.pbl.teamFormationEnd && new Date() > team.pbl.teamFormationEnd) {
      throw new Error('Team formation deadline has passed.');
    }

    // Check if the invited person is from a section already in the team
    const newSection = section.toUpperCase();
    const existingSections = team.members.map(m => m.student.section.toUpperCase());
    if (existingSections.includes(newSection)) {
      throw new Error(`Someone from Section ${newSection} is already in the team. Every team member must belong to a different section!`);
    }

    // 1. Process invited student (similar to createTeam logic)
    let student = await prisma.student.findFirst({
      where: { enrollmentNumber: rollNo, section: { equals: section, mode: 'insensitive' } }
    });

    if (!student) {
      const wrongSectionStudent = await prisma.student.findFirst({ where: { enrollmentNumber: rollNo } });
      if (wrongSectionStudent) throw new Error(`Roll No ${rollNo} exists but is registered in Section ${wrongSectionStudent.section}.`);

      if (email) {
        if (!email.toLowerCase().endsWith('@geu.ac.in')) throw new Error('Email must belong to @geu.ac.in');
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) throw new Error('Email is already registered.');
      }

      const defaultPassword = await bcrypt.hash(email || `dummy_${rollNo}@dummy.geu.ac.in`, 10);
      const dummyUser = await prisma.user.create({
        data: {
          email: email || `dummy_${rollNo}@dummy.geu.ac.in`,
          name: name || `Student ${rollNo}`,
          passwordHash: defaultPassword,
          role: 'STUDENT',
          isVerified: false,
          studentProfile: { create: { enrollmentNumber: rollNo, section: section.toUpperCase() } }
        },
        include: { studentProfile: true }
      });
      student = dummyUser.studentProfile;
    }

    // Check if student is already in a team for this PBL
    const existingMember = await prisma.teamMember.findFirst({
      where: { studentId: student.id, team: { pblId: team.pblId } }
    });
    if (existingMember) throw new Error(`Student ${rollNo} is already in a team for this PBL.`);

    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        studentId: student.id,
        status: 'ACCEPTED'
      },
      include: { student: { include: { user: true } } }
    });

    res.json({ message: 'Member invited successfully.', member: newMember });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a member from a team (by leader)
// @route   DELETE /api/student/team/:teamId/member/:studentId
// @access  Private/Student
const removeMember = async (req, res, next) => {
  try {
    const { teamId, studentId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { pbl: true, members: true }
    });

    if (!team) throw new Error('Team not found');
    if (team.leaderId !== req.user.studentProfileId) throw new Error('Only the team leader can remove members.');
    if (team.leaderId === studentId) throw new Error('You cannot remove yourself. Delete the team instead.');

    if (team.pbl.teamFormationEnd && new Date() > team.pbl.teamFormationEnd) {
      throw new Error('Team formation deadline has passed. You can no longer edit the team.');
    }

    await prisma.teamMember.update({
      where: { teamId_studentId: { teamId, studentId } },
      data: { status: 'REMOVAL_REQUESTED' }
    });

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending invitations
// @route   GET /api/student/invitations
// @access  Private/Student
const getInvitations = async (req, res, next) => {
  try {
    const invitations = await prisma.teamMember.findMany({
      where: {
        studentId: req.user.studentProfileId,
        status: { in: ['PENDING', 'REMOVAL_REQUESTED'] }
      },
      include: {
        team: {
          include: {
            pbl: true,
            leader: { include: { user: true } },
            members: { include: { student: { include: { user: true } } } }
          }
        }
      }
    });

    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to invitation
// @route   POST /api/student/invitations/:teamId/respond
// @access  Private/Student
const respondToInvitation = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'REJECT'
    const studentId = req.user.studentProfileId;

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_studentId: { teamId, studentId } },
      include: { team: { include: { pbl: true } } }
    });

    if (!membership) throw new Error('Request not found.');
    if (membership.status !== 'PENDING' && membership.status !== 'REMOVAL_REQUESTED') {
      throw new Error('You have already responded to this request.');
    }

    if (membership.status === 'REMOVAL_REQUESTED') {
      if (action === 'ACCEPT') {
        await prisma.teamMember.delete({ where: { id: membership.id } });
        res.json({ message: 'Removal accepted. You have been removed from the team.' });
      } else if (action === 'REJECT') {
        await prisma.teamMember.update({
          where: { id: membership.id },
          data: { status: 'ACCEPTED' }
        });
        res.json({ message: 'Removal request rejected.' });
      }
      return;
    }

    if (action === 'ACCEPT') {
      // Reject any other pending invitations for this same PBL automatically
      await prisma.teamMember.deleteMany({
        where: {
          studentId,
          status: 'PENDING',
          team: { pblId: membership.team.pblId },
          NOT: { teamId }
        }
      });

      await prisma.teamMember.update({
        where: { id: membership.id },
        data: { status: 'ACCEPTED' }
      });
      res.json({ message: 'Invitation accepted successfully.' });
    } else if (action === 'REJECT') {
      await prisma.teamMember.delete({
        where: { id: membership.id }
      });
      res.json({ message: 'Invitation rejected.' });
    } else {
      throw new Error('Invalid action.');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Peer Evaluation Tasks for Student
// @route   GET /api/student/micro-mentor/tasks
// @access  Private/Student
const getMicroMentorTasks = async (req, res, next) => {
  try {
    const studentId = req.user.studentProfileId;

    // Get all teams this student belongs to
    const myTeams = await prisma.teamMember.findMany({
      where: { studentId, status: 'ACCEPTED' },
      select: { teamId: true }
    });
    const teamIds = myTeams.map(t => t.teamId);

    // Find assignments where the reviewerTeam is one of the student's teams
    const assignments = await prisma.microMentorAssignment.findMany({
      where: { reviewerTeamId: { in: teamIds } },
      include: {
        phase: true,
        examineeTeam: {
          include: {
            submissions: true
          }
        },
        evaluations: {
          where: { reviewerStudentId: studentId } // check if already evaluated by this student
        }
      }
    });

    // Format response to hide examinee identity
    const tasks = assignments.map(assignment => {
      const submission = assignment.examineeTeam.submissions.find(s => s.phaseId === assignment.phaseId);
      
      return {
        id: assignment.id,
        phase: assignment.phase,
        isEvaluated: assignment.evaluations.length > 0,
        myEvaluation: assignment.evaluations[0] || null,
        examineeProject: {
          synopsisUrl: submission ? submission.synopsisUrl : null,
          fileUrls: submission ? submission.fileUrls : []
        }
      };
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Micro Mentor Grade
// @route   POST /api/student/micro-mentor/evaluate/:assignmentId
// @access  Private/Student
const submitMicroMentorGrade = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { marksData } = req.body;
    const studentId = req.user.studentProfileId;

    const assignment = await prisma.microMentorAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) throw new Error('Assignment not found');

    const totalMarks = Object.values(marksData).reduce((sum, val) => sum + (Number(val) || 0), 0);

    const evaluation = await prisma.microMentorEvaluation.upsert({
      where: {
        assignmentId_reviewerStudentId: {
          assignmentId,
          reviewerStudentId: studentId
        }
      },
      update: {
        marksData,
        totalMarks,
        evaluatedAt: new Date()
      },
      create: {
        assignmentId,
        reviewerStudentId: studentId,
        marksData,
        totalMarks
      }
    });

    res.json({ message: 'Peer evaluation submitted successfully!', evaluation });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeam,
  getMyTeam,
  getSubmissionForPhase,
  submitPhase,
  getActivePbls,
  getStudentByRoll,
  inviteMember,
  removeMember,
  getInvitations,
  respondToInvitation,
  getMicroMentorTasks,
  submitMicroMentorGrade
};
