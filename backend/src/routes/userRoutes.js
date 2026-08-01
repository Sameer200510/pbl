const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { uploadExcel } = require('../middlewares/upload');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  bulkUploadUsers,
  bulkUploadUsersJson,
  bulkDeleteUsers
} = require('../controllers/userController');

// All user management routes require admin access
router.use(protect, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/', getAllUsers);
router.post('/', createUser);
router.post('/bulk', uploadExcel.single('file'), bulkUploadUsers);
router.post('/bulk-json', bulkUploadUsersJson);
router.post('/bulk-delete', bulkDeleteUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetUserPassword);

module.exports = router;
