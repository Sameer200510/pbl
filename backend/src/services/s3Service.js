const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const crypto = require('crypto');
const path = require('path');

let s3Client = null;

if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const getS3Storage = () => {
  if (!s3Client || !process.env.AWS_S3_BUCKET) {
    return null; // Return null if S3 is not configured
  }

  return multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const randomName = crypto.randomBytes(16).toString('hex');
      cb(null, `reports/${randomName}${ext}`);
    }
  });
};

module.exports = {
  s3Client,
  getS3Storage,
};
