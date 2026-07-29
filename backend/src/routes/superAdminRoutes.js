const express = require('express');
const router = express.Router();
const { 
  wipeTeams, 
  wipePbls, 
  wipeStudents, 
  wipeFaculty, 
  wipeAll,
  getSettings,
  updateSettings
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

// All routes are protected and require SUPER_ADMIN role
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.delete('/wipe/teams', wipeTeams);
router.delete('/wipe/pbls', wipePbls);
router.delete('/wipe/students', wipeStudents);
router.delete('/wipe/faculty', wipeFaculty);
router.delete('/wipe/all', wipeAll);

router.get('/settings', getSettings);
router.post('/settings', updateSettings);

module.exports = router;
