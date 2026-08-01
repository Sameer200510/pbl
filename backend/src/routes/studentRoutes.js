const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/studentController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadDocument } = require('../middlewares/upload');

router.use(protect);
router.use(authorize('STUDENT'));

router.post('/team', createTeam);
router.get('/team/my-team', getMyTeam);
router.post('/team/invite', inviteMember);
router.delete('/team/:teamId/member/:studentId', removeMember);
router.get('/invitations', getInvitations);
router.post('/invitations/:teamId/respond', respondToInvitation);

router.get('/pbls', getActivePbls);

// Phase submissions
router.get('/team/:teamId/phase/:phaseNumber', getSubmissionForPhase);
router.post('/phase', uploadDocument, submitPhase);

// Fetch details
router.get('/by-roll/:rollNo', getStudentByRoll);

// Micro Mentoring
router.get('/micro-mentor/tasks', getMicroMentorTasks);
router.post('/micro-mentor/evaluate/:assignmentId', submitMicroMentorGrade);

module.exports = router;
