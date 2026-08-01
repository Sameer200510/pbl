const multer = require('multer');
const path = require('path');

const crypto = require('crypto');

const storage = multer.memoryStorage();

const uploadExcel = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/csv', 'application/vnd.ms-excel.csv.csv'];
    if ((ext !== '.xlsx' && ext !== '.xls' && ext !== '.csv') || !allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only valid Excel or CSV files are allowed'), false);
    }
    cb(null, true);
  }
});

const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const prisma = require('../config/db');
const fs = require('fs');

// Ensure local uploads directory exists
const localUploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

const docStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${file.fieldname}-${randomName}${ext}`);
  }
});

const { getS3Storage } = require('../services/s3Service');

const uploadDocument = async (req, res, next) => {
  try {
    const fileFilter = (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if ((ext !== '.pdf' && ext !== '.docx') || !allowedMimes.includes(file.mimetype)) {
        return cb(new Error('Only valid PDF and DOCX files are allowed'), false);
      }
      cb(null, true);
    };

    let uploadMiddleware;
    const s3Storage = getS3Storage();

    if (s3Storage) {
      uploadMiddleware = multer({ storage: s3Storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('report');
    } else {
      uploadMiddleware = multer({ storage: docStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('report');
    }

    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      // Attach a flag to req so controller knows if it was S3 or Local
      req.uploadType = s3Storage ? 'S3' : 'LOCAL';
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadExcel, uploadDocument };
