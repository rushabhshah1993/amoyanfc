/* Package imports */
import express from 'express';
import multer from 'multer';
import { uploadToS3, deleteFromS3, generateUniqueFileName } from '../services/s3.service.js';

const router = express.Router();

/* Configure multer to use memory storage */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    },
});

/**
 * Upload article thumbnail
 * POST /api/upload/article-thumbnail
 */
router.post('/article-thumbnail', upload.single('thumbnail'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { articleId } = req.body;
        
        if (!articleId) {
            return res.status(400).json({ error: 'Article ID is required' });
        }

        // Generate unique filename
        const fileName = generateUniqueFileName(req.file.originalname);
        const key = `articles/${articleId}/thumbnail/${fileName}`;

        // Upload to S3
        const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

        res.json({
            success: true,
            url,
            key,
            message: 'Thumbnail uploaded successfully',
        });
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        res.status(500).json({
            error: 'Failed to upload thumbnail',
            message: error.message,
        });
    }
});

/**
 * Upload article media (images/videos for content)
 * POST /api/upload/article-media
 */
router.post('/article-media', upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { articleId } = req.body;
        
        if (!articleId) {
            return res.status(400).json({ error: 'Article ID is required' });
        }

        // Generate unique filename
        const fileName = generateUniqueFileName(req.file.originalname);
        const mediaType = req.file.mimetype.startsWith('image/') ? 'images' : 'videos';
        const key = `articles/${articleId}/${mediaType}/${fileName}`;

        // Upload to S3
        const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

        res.json({
            success: true,
            url,
            key,
            mediaType,
            message: 'Media uploaded successfully',
        });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({
            error: 'Failed to upload media',
            message: error.message,
        });
    }
});

/**
 * Upload multiple media files
 * POST /api/upload/article-media-batch
 */
router.post('/article-media-batch', upload.array('media', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { articleId } = req.body;
        
        if (!articleId) {
            return res.status(400).json({ error: 'Article ID is required' });
        }

        // Upload all files to S3
        const uploadPromises = req.files.map(async (file) => {
            const fileName = generateUniqueFileName(file.originalname);
            const mediaType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
            const key = `articles/${articleId}/${mediaType}/${fileName}`;
            
            const url = await uploadToS3(file.buffer, key, file.mimetype);
            
            return {
                url,
                key,
                mediaType,
                originalName: file.originalname,
            };
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        res.json({
            success: true,
            files: uploadedFiles,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
        });
    } catch (error) {
        console.error('Error uploading media batch:', error);
        res.status(500).json({
            error: 'Failed to upload media files',
            message: error.message,
        });
    }
});

/**
 * Delete article media
 * DELETE /api/upload/article-media
 */
router.delete('/article-media', async (req, res) => {
    try {
        const { key } = req.body;
        
        if (!key) {
            return res.status(400).json({ error: 'S3 key is required' });
        }

        await deleteFromS3(key);

        res.json({
            success: true,
            message: 'Media deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({
            error: 'Failed to delete media',
            message: error.message,
        });
    }
});

export default router;


