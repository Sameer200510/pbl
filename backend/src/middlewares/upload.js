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

const uploadDocument = async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });

    const fileFilter = (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if ((ext !== '.pdf' && ext !== '.docx') || !allowedMimes.includes(file.mimetype)) {
        return cb(new Error('Only valid PDF and DOCX files are allowed'), false);
      }
      cb(null, true);
    };

    let uploadMiddleware;

    if (settings?.useS3Storage && settings.awsAccessKeyId && settings.awsSecretAccessKey && settings.awsRegion && settings.awsS3Bucket) {
      const s3 = new S3Client({
        region: settings.awsRegion,
        credentials: {
          accessKeyId: settings.awsAccessKeyId,
          secretAccessKey: settings.awsSecretAccessKey
        }
      });

      const s3Storage = multerS3({
        s3: s3,
        bucket: settings.awsS3Bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          const ext = path.extname(file.originalname).toLowerCase();
          const randomName = crypto.randomBytes(16).toString('hex');
          cb(null, `reports/${randomName}${ext}`);
        }
      });

      uploadMiddleware = multer({ storage: s3Storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('report');
    } else {
      uploadMiddleware = multer({ storage: docStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('report');
    }

    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      // Attach a flag to req so controller knows if it was S3 or Local
      req.uploadType = (settings?.useS3Storage && settings.awsS3Bucket) ? 'S3' : 'LOCAL';
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadExcel, uploadDocument };
