const prisma = require('../config/db'); // trigger restart

// @desc    Get teams where faculty is Mentor
// @route   GET /api/faculty/mentor/teams
// @access  Private/Faculty
const getMentoredTeams = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    if (!facultyId) {
      res.status(403);
      throw new Error('Not registered as a faculty member.');
    }

    const teams = await prisma.team.findMany({
      where: { mentorId: facultyId },
      include: {
        pbl: { include: { phases: true, pblFaculties: { where: { facultyId } } } },
        leader: { include: { user: true } },
        members: { include: { student: { include: { user: true } } } },
        submissions: { include: { mentorGrades: true } },
        examineeAssignments: { include: { evaluations: true } }
      }
    });

    res.json(teams);
  } catch (error) {
    next(error);
  }
};

// @desc    Get teams where faculty is Evaluator
// @route   GET /api/faculty/evaluator/teams
// @access  Private/Faculty
const getEvaluatedTeams = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    if (!facultyId) {
      res.status(403);
      throw new Error('Not registered as a faculty member.');
    }

    const teams = await prisma.team.findMany({
      where: {
        phaseEvaluators: {
          some: {
            evaluatorId: facultyId
          }
        }
      },
      include: {
        pbl: { include: { phases: true, pblFaculties: { where: { facultyId } } } },
        leader: { include: { user: true } },
        members: { include: { student: { include: { user: true } } } },
        submissions: { include: { mentorGrades: { orderBy: { gradedAt: 'desc' } } } },
        phaseEvaluators: {
          where: { evaluatorId: facultyId }
        },
        examineeAssignments: { include: { evaluations: true } }
      }
    });

    res.json(teams);
  } catch (error) {
    next(error);
  }
};

// @desc    Grade a submission as a Mentor
// @route   POST /api/faculty/mentor/grade/:submissionId
// @access  Private/Faculty
const mentorGradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { grade, remarks } = req.body; // grade should be 0 or 1
    const facultyId = req.user.facultyProfileId;

    if (grade !== 0 && grade !== 1) {
      res.status(400);
      throw new Error('Grade must be 0 or 1');
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { team: true }
    });

    if (!submission || submission.team.mentorId !== facultyId) {
      res.status(403);
      throw new Error('Not authorized to grade this submission.');
    }

    const mentorGrade = await prisma.mentorGrade.upsert({
      where: {
        submissionId_mentorId: {
          submissionId,
          mentorId: facultyId
        }
      },
      update: { grade, remarks, gradedAt: new Date() },
      create: {
        submissionId,
        mentorId: facultyId,
        grade,
        remarks
      }
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'GRADED' }
    });

    res.json({ message: 'Submission graded successfully', mentorGrade });

    // Background Moodle Grade Sync for Mentor Approval
    const phase = await prisma.phase.findUnique({ where: { id: submission.phaseId } });
    if (phase?.moodleAssignmentId) {
      // Find all team members to push grade to everyone
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: submission.teamId },
        include: { student: true }
      });

      const { syncGradeToMoodle } = require('../services/moodleService');
      
      for (const member of teamMembers) {
        const studentProfile = member.student;
        const moodleIdToUse = studentProfile?.moodleId || studentProfile?.enrollmentNumber;
        
        if (moodleIdToUse) {
          let feedback = remarks || (grade === 1 ? 'Approved by Mentor' : 'Rejected by Mentor');
          
          // Append the file link to the feedback so it's accessible in Moodle
          if (submission.synopsisUrl) {
            feedback += `\n\nSubmitted File (PBL Portal): ${submission.synopsisUrl}`;
          }

          syncGradeToMoodle(moodleIdToUse, phase.moodleAssignmentId, grade, feedback).catch(err => {
            console.error(`Non-blocking Moodle grade sync error for ${moodleIdToUse}:`, err);
          });
        }
      }
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate a student's phase submission as an Evaluator
// @route   POST /api/faculty/evaluator/evaluate/:phaseId/:studentId
// @access  Private/Faculty
const evaluateStudent = async (req, res, next) => {
  try {
    const { phaseId, studentId } = req.params;
    const { marksData } = req.body; 
    const facultyId = req.user.facultyProfileId;

    if (!marksData) {
      res.status(400);
      throw new Error('Marks data is required.');
    }

    // Calculate total marks from the JSON marksData object
    let totalMarks = 0;
    Object.values(marksData).forEach(mark => {
      if (mark !== 'AB' && !isNaN(Number(mark))) {
        totalMarks += Number(mark);
      }
    });

    const evaluation = await prisma.evaluation.upsert({
      where: {
        phaseId_studentId_evaluatorId: {
          phaseId,
          studentId,
          evaluatorId: facultyId
        }
      },
      update: { marksData, totalMarks, evaluatedAt: new Date() },
      create: {
        phaseId,
        studentId,
        evaluatorId: facultyId,
        marksData,
        totalMarks
      }
    });

    res.json({ message: 'Evaluation submitted successfully', evaluation });
  } catch (error) {
    next(error);
  }
};

const getTeamEvaluations = async (req, res, next) => {
  try {
    const { phaseId, teamId } = req.params;
    const facultyId = req.user.facultyProfileId;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true }
    });

    if (!team) return res.json([]);

    const studentIds = team.members.map(m => m.studentId);

    const evaluations = await prisma.evaluation.findMany({
      where: {
        phaseId,
        evaluatorId: facultyId,
        studentId: { in: studentIds }
      }
    });

    res.json(evaluations);
  } catch (error) {
    next(error);
  }
};

const finishTeamEvaluation = async (req, res, next) => {
  try {
    const { phaseId, teamId } = req.params;
    const { remarks, projectLevel } = req.body;
    const facultyId = req.user.facultyProfileId;

    const teamPhaseEvaluator = await prisma.teamPhaseEvaluator.findUnique({
      where: {
        teamId_phaseId: {
          teamId,
          phaseId
        }
      }
    });

    if (!teamPhaseEvaluator || teamPhaseEvaluator.evaluatorId !== facultyId) {
      res.status(403);
      throw new Error('Not authorized to evaluate this team phase.');
    }

    const updated = await prisma.teamPhaseEvaluator.update({
      where: { id: teamPhaseEvaluator.id },
      data: {
        status: 'EVALUATED',
        remarks
      }
    });

    if (projectLevel) {
      await prisma.team.update({
        where: { id: teamId },
        data: { projectLevel }
      });
    }

    res.json({ message: 'Team evaluation finished', evaluationState: updated });
  } catch (error) {
    next(error);
  }
};

const getPreviousPhaseRemarks = async (req, res, next) => {
  try {
    const { phaseNumber, teamId } = req.params;
    const currentPhaseNumber = parseInt(phaseNumber);
    
    if (currentPhaseNumber <= 1) {
      return res.json({ remarks: null });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.json({ remarks: null });

    const previousPhase = await prisma.phase.findFirst({
      where: {
        pblId: team.pblId,
        phaseNumber: currentPhaseNumber - 1
      }
    });

    if (!previousPhase) return res.json({ remarks: null });

    const teamPhaseEvaluator = await prisma.teamPhaseEvaluator.findUnique({
      where: {
        teamId_phaseId: {
          teamId,
          phaseId: previousPhase.id
        }
      }
    });

    res.json({ remarks: teamPhaseEvaluator?.remarks || null });
  } catch (error) {
    next(error);
  }
};

const getPendingReevaluations = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    const reevaluations = await prisma.reevaluationAssignment.findMany({
      where: {
        evaluatorId: facultyId,
        status: 'PENDING'
      },
      include: {
        student: {
          include: {
            user: true,
            teamMembers: {
              include: { team: { include: { pbl: true } } }
            }
          }
        },
        phase: true
      }
    });
    res.json(reevaluations);
  } catch (error) {
    next(error);
  }
};

const submitReevaluationMarks = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    const { studentId, phaseId, marksData, totalMarks } = req.body;

    const assignment = await prisma.reevaluationAssignment.findUnique({
      where: { studentId_phaseId: { studentId, phaseId } }
    });

    if (!assignment || assignment.evaluatorId !== facultyId) {
      res.status(403);
      throw new Error('Not authorized to re-evaluate this student.');
    }

    // Upsert Evaluation
    const evaluation = await prisma.evaluation.upsert({
      where: {
        phaseId_studentId_evaluatorId: {
          phaseId,
          studentId,
          evaluatorId: facultyId
        }
      },
      update: { marksData, totalMarks },
      create: { phaseId, studentId, evaluatorId: facultyId, marksData, totalMarks }
    });

    // Update ReevaluationAssignment status
    await prisma.reevaluationAssignment.update({
      where: { id: assignment.id },
      data: { status: 'EVALUATED' }
    });

    res.json({ message: 'Re-evaluation marks saved successfully', evaluation });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a mentor interaction/visit
// @route   POST /api/faculty/mentor/team/:teamId/interaction
// @access  Private/Faculty (Mentor only)
const logInteraction = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    const { teamId } = req.params;
    const { records } = req.body; // Array of { studentId, isPresent, remark }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { interactions: true }
    });

    if (!team) throw new Error('Team not found');
    if (team.mentorId !== facultyId) throw new Error('Not authorized to log interactions for this team.');
    
    if (team.interactions.length >= 8) {
      throw new Error('Maximum number of interactions (8) has already been reached for this team.');
    }

    const visitNumber = team.interactions.length + 1;

    const interaction = await prisma.interaction.create({
      data: {
        teamId,
        mentorId: facultyId,
        visitNumber,
        studentRecords: {
          create: records.map(r => ({
            studentId: r.studentId,
            isPresent: r.isPresent,
            remark: r.remark || null
          }))
        }
      },
      include: { studentRecords: true }
    });

    res.status(201).json({ message: 'Interaction logged successfully', interaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Get interactions for a team
// @route   GET /api/faculty/team/:teamId/interactions (also exposed in admin routes)
// @access  Private/Faculty or Admin
const getInteractions = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    
    const interactions = await prisma.interaction.findMany({
      where: { teamId },
      orderBy: { visitNumber: 'asc' },
      include: {
        mentor: { include: { user: true } },
        studentRecords: { include: { student: { include: { user: true } } } }
      }
    });

    res.json(interactions);
  } catch (error) {
    next(error);
  }
};

// @desc    Update Faculty Venue
// @route   PUT /api/faculty/venue
// @access  Private/Faculty
const updateVenue = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    const { venue } = req.body;
    if (!facultyId) {
      res.status(403);
      throw new Error('Not registered as a faculty member.');
    }

    const updated = await prisma.faculty.update({
      where: { id: facultyId },
      data: { venue }
    });

    res.json({ message: 'Venue updated successfully', venue: updated.venue });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Faculty Venue
// @route   GET /api/faculty/venue
// @access  Private/Faculty
const getVenue = async (req, res, next) => {
  try {
    const facultyId = req.user.facultyProfileId;
    if (!facultyId) {
      res.status(403);
      throw new Error('Not registered as a faculty member.');
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { venue: true }
    });

    res.json({ venue: faculty?.venue || '' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMentoredTeams,
  getEvaluatedTeams,
  mentorGradeSubmission,
  evaluateStudent,
  getTeamEvaluations,
  finishTeamEvaluation,
  getPreviousPhaseRemarks,
  getPendingReevaluations,
  submitReevaluationMarks,
  logInteraction,
  getInteractions,
  updateVenue,
  getVenue
};
