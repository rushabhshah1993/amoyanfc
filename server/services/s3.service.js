/* AWS SDK imports */
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/* Environment configuration */
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'amoyanfc-assets';
const REGION = process.env.AWS_REGION || 'us-east-1';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'https://E2JUFP5XP02KD2.cloudfront.net';

/* Initialize S3 Client */
const s3Client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {String} key - The S3 key (path) for the file
 * @param {String} contentType - The MIME type of the file
 * @returns {Promise<String>} - The S3 URL of the uploaded file
 */
export const uploadToS3 = async (fileBuffer, key, contentType) => {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            // No ACL needed - CloudFront handles access via Origin Access Control
        });

        await s3Client.send(command);
        
        // Return the S3 URL (same format as fighter images)
        return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
};

/**
 * Delete a file from S3
 * @param {String} key - The S3 key (path) of the file to delete
 * @returns {Promise<void>}
 */
export const deleteFromS3 = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting from S3:', error);
        throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
};

/**
 * Generate a signed URL for private S3 objects
 * @param {String} key - The S3 key (path) of the file
 * @param {Number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<String>} - The signed URL
 */
export const getSignedUrlForS3 = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
};

/**
 * Extract S3 key from URL
 * @param {String} url - The S3 URL
 * @returns {String} - The S3 key
 */
export const extractS3Key = (url) => {
    try {
        const urlObj = new URL(url);
        // Remove leading slash
        return urlObj.pathname.substring(1);
    } catch (error) {
        console.error('Error extracting S3 key:', error);
        return null;
    }
};

/**
 * Generate a unique file name with timestamp
 * @param {String} originalName - Original file name
 * @returns {String} - Unique file name
 */
export const generateUniqueFileName = (originalName) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(`.${extension}`, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
};

export default {
    uploadToS3,
    deleteFromS3,
    getSignedUrlForS3,
    extractS3Key,
    generateUniqueFileName,
};

