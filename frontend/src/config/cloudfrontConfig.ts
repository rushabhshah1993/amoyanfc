/**
 * AmoyanFC Image Configuration
 * 
 * INSTRUCTIONS:
 * 1. Get your CloudFront Distribution ID from AWS Console
 * 2. Replace YOUR_DISTRIBUTION_ID below with your actual distribution ID
 * 3. Save this file
 * 
 * Example: If your distribution ID is E1234567890ABC, change:
 * baseUrl: 'https://E1234567890ABC.cloudfront.net'
 */

export const CLOUDFRONT_DISTRIBUTION_ID = 'E2JUFP5XP02KD2'; // Your actual distribution ID

export const CLOUDFRONT_BASE_URL = `https://${CLOUDFRONT_DISTRIBUTION_ID}.cloudfront.net`;

// Check if CloudFront is properly configured
export const isCloudFrontConfigured = (): boolean => {
  return !CLOUDFRONT_DISTRIBUTION_ID.includes('YOUR_DISTRIBUTION_ID');
};

// Get the appropriate base URL
export const getImageBaseUrl = (): string => {
  if (isCloudFrontConfigured()) {
    return CLOUDFRONT_BASE_URL;
  } else {
    console.warn('CloudFront not configured, using S3 directly');
    return 'https://amoyanfc-assets.s3.us-east-1.amazonaws.com';
  }
};
