const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('FACULTY'));

router.put('/venue', updateVenue);
router.get('/venue', getVenue);

router.get('/mentor/teams', getMentoredTeams);
router.post('/mentor/grade/:submissionId', mentorGradeSubmission);
router.post('/mentor/team/:teamId/interaction', logInteraction);
router.get('/team/:teamId/interactions', getInteractions);

router.get('/evaluator/teams', getEvaluatedTeams);
router.post('/evaluator/evaluate/:phaseId/:studentId', evaluateStudent);
router.get('/evaluator/evaluations/:phaseId/:teamId', getTeamEvaluations);
router.put('/evaluator/finish/:phaseId/:teamId', finishTeamEvaluation);
router.get('/evaluator/previous-remarks/:phaseNumber/:teamId', getPreviousPhaseRemarks);

router.get('/evaluator/re-evaluations', getPendingReevaluations);
router.post('/evaluator/re-evaluations/submit', submitReevaluationMarks);

module.exports = router;
