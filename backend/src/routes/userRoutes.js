const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const { uploadExcel } = require('../middlewares/upload');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  bulkUploadUsers
} = require('../controllers/userController');

// All user management routes require admin access
router.use(protect, admin);

router.get('/', getAllUsers);
router.post('/', createUser);
router.post('/bulk', uploadExcel.single('file'), bulkUploadUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetUserPassword);

module.exports = router;
