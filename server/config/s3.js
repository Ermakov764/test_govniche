const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Ensure bucket exists
const ensureBucketExists = async () => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`✅ S3 bucket "${BUCKET_NAME}" exists`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`⚠️  Bucket "${BUCKET_NAME}" does not exist. Creating...`);
      try {
        await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
        console.log(`✅ Bucket "${BUCKET_NAME}" created successfully`);
      } catch (createError) {
        console.error(`❌ Failed to create bucket: ${createError.message}`);
        throw createError;
      }
    } else {
      console.error(`❌ Error checking bucket: ${error.message}`);
      throw error;
    }
  }
};

module.exports = {
  s3,
  BUCKET_NAME,
  ensureBucketExists
};
