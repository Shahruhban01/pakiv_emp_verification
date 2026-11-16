const { S3Client } = require('@aws-sdk/client-s3');
const config = require('./env');

let s3Client = null;

function getR2Client() {
  if (!config.r2.isConfigured()) {
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }

  return s3Client;
}

module.exports = {
  getR2Client,
};

