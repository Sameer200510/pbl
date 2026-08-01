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
    const assignmentId = 12136; // Using the resolved true Assignment Instance ID
    
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
    
    // Test 4: Include workflowstate and applytoall, but no plugindata
    try {
      const p4 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: -1,
        addattempt: 0,
        workflowstate: 'graded',
        applytoall: 1
      });
      const r4 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p4.toString());
      results.test4 = r4.data;
    } catch(e) { results.test4 = e.message; }

    // Test 5: Include workflowstate but applytoall = 0 (for non-group assignments)
    try {
      const p5 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: -1,
        addattempt: 0,
        workflowstate: 'graded',
        applytoall: 0
      });
      const r5 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p5.toString());
      results.test5 = r5.data;
    } catch(e) { results.test5 = e.message; }

    // Test 6: Everything including plugindata
    try {
      const p6 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: -1,
        addattempt: 0,
        workflowstate: 'graded',
        applytoall: 0,
        'plugindata[assignfeedbackcomments_editor][text]': 'test',
        'plugindata[assignfeedbackcomments_editor][format]': 1
      });
      const r6 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p6.toString());
      results.test6 = r6.data;
    } catch(e) { results.test6 = e.message; }
    
    // Test 7: Everything with attemptnumber 0 instead of -1
    try {
      const p7 = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_save_grade',
        moodlewsrestformat: 'json',
        assignmentid: assignmentId,
        userid: moodleUserId,
        grade: 1.0,
        attemptnumber: 0,
        addattempt: 0,
        workflowstate: 'graded',
        applytoall: 0,
        'plugindata[assignfeedbackcomments_editor][text]': 'test',
        'plugindata[assignfeedbackcomments_editor][format]': 1
      });
      const r7 = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, p7.toString());
      results.test7 = r7.data;
    } catch(e) { results.test7 = e.message; }

    // Resolve CMID to Instance ID
    try {
      const pResolve = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'core_course_get_course_module',
        moodlewsrestformat: 'json',
        cmid: assignmentId
      });
      const rResolve = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, pResolve.toString());
      results.resolve_cmid = rResolve.data;
    } catch(e) { results.resolve_cmid = e.message; }
    
    // Also try mod_assign_get_assignments
    try {
      const pAssigns = new URLSearchParams({
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'mod_assign_get_assignments',
        moodlewsrestformat: 'json'
      });
      const rAssigns = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, pAssigns.toString());
      
      // Look for the one with cmid = 28286
      if (rAssigns.data && rAssigns.data.courses) {
        let found = null;
        for (const c of rAssigns.data.courses) {
          for (const a of c.assignments) {
            if (a.cmid == assignmentId) {
              found = a;
            }
          }
        }
        results.resolve_mod_assign = found ? found : 'Not found in mod_assign_get_assignments';
      } else {
        results.resolve_mod_assign = rAssigns.data;
      }
    } catch(e) { results.resolve_mod_assign = e.message; }

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
