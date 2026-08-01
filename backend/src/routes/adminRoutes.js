const express = require('express');
const router = express.Router();
const {
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
  downloadReport,
  resetUserPassword,
  getDashboardStats,
  getSettings,
  updateSettings,
  autoFormTeams,
  unlockForReevaluation,
  bulkReevaluation,
  getReevaluations,
  adminUpdateMarks,
  getAllStudents,
  bulkDeleteTeams,
  bulkUploadTeams
} = require('../controllers/adminController');
const { getInteractions } = require('../controllers/facultyController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadExcel } = require('../middlewares/upload');
const axios = require('axios');
const prisma = require('../config/db');

// Apply protection and RBAC to all routes
router.get('/moodle-test', async (req, res) => {
  try {
    const { getMoodleConfig } = require('../services/moodleService');
    const config = await getMoodleConfig();
    const MOODLE_URL = config.MOODLE_URL;
    const MOODLE_API_TOKEN = config.MOODLE_API_TOKEN;
    const assignmentId = 28286;
    
    const userParams = new URLSearchParams({
      wstoken: MOODLE_API_TOKEN,
      wsfunction: 'core_user_get_users_by_field',
      moodlewsrestformat: 'json',
      field: 'username',
      'values[0]': 'stest36'
    });
    
    const userRes = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, userParams.toString());
    const moodleUserId = userRes.data[0]?.id;
    
    const results = {};
    
    // Test 1: Just grade, attemptnumber 0, no addattempt, no plugindata
    try {
      const p1 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: 0
      });
      const r1 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p1.toString());
      results.test1 = r1.data;
    } catch(e) { results.test1 = e.message; }

    // Test 2: grade, attemptnumber -1, addattempt 0
    try {
      const p2 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: -1,
        addattempt: 0
      });
      const r2 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p2.toString());
      results.test2 = r2.data;
    } catch(e) { results.test2 = e.message; }

    // Test 3: with plugindata and attempt 0
    try {
      const p3 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: 0,
        addattempt: 0,
        'plugindata[assignfeedbackcomments_editor][text]': 'Test feedback link',
        'plugindata[assignfeedbackcomments_editor][format]': 1
      });
      const r3 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p3.toString());
      results.test3 = r3.data;
    } catch(e) { results.test3 = e.message; }

    res.json(results);
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply protection and RBAC to all other routes
router.use(protect);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/team/:teamId/interactions', getInteractions);

router.route('/faculty')
  .get(getAllFaculty)
  .post(addFaculty);

router.route('/students')
  .get(getAllStudents);
router.post('/mentor-mapping', assignMentors);
router.post('/evaluator-mapping', assignEvaluators);
router.post('/random-map/mentors', randomMapMentors);
router.post('/random-map/evaluators', randomMapEvaluators);
router.post('/re-evaluation/unlock', unlockForReevaluation);
router.post('/re-evaluation/bulk', uploadExcel.single('file'), bulkReevaluation);
router.get('/re-evaluation/list/:phaseId', getReevaluations);
router.get('/reports/:type', downloadReport);
router.get('/reports/marks/:pblId', getMarksForPbl);
router.put('/reports/marks/update', adminUpdateMarks);
router.get('/stats', getDashboardStats);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

router.route('/pbl')
  .post(createPbl)
  .get(getPbls);

router.post('/pbl/:pblId/auto-form-teams', autoFormTeams);
router.post('/pbl/:pblId/teams/bulk', uploadExcel.single('file'), bulkUploadTeams);

router.route('/pbl/:id')
  .put(updatePbl)
  .delete(archivePbl);

router.delete('/pbl/hard/:id', deletePbl);

router.post('/pbl/:id/timeline', updatePblTimeline);
router.post('/pbl/:id/phase-timeline/:phaseNumber', updatePhaseTimeline);
router.post('/pbl/:id/phase-config', updatePhaseConfig);

router.route('/teams')
  .post(createTeamAdmin);

router.post('/teams/bulk-delete', bulkDeleteTeams);

router.route('/teams/:id')
  .put(updateTeam)
  .delete(deleteTeam);

router.post('/teams/:id/members', addTeamMemberAdmin);
router.delete('/teams/:id/members/:studentId', removeTeamMemberAdmin);

router.get('/teams/pbl/:pblId', getTeamsForPbl);

module.exports = router;
