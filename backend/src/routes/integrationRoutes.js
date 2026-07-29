const express = require('express');
const router = express.Router();
const { checkPlagiarism } = require('../controllers/plagiarismController');
const { protect, authorize } = require('../middlewares/auth');

// Apply protection and RBAC
router.use(protect);
router.use(authorize('FACULTY', 'ADMIN', 'SUPER_ADMIN'));

router.post('/plagiarism-check', checkPlagiarism);

module.exports = router;
