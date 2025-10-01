/**
 * Utility functions for Google Drive image handling
 */

/**
 * Converts a Google Drive image URL to the direct view format
 * @param googleDriveUrl - The original Google Drive URL
 * @returns The converted URL for direct image viewing
 */
export const convertGoogleDriveUrl = (googleDriveUrl: string): string => {
  if (!googleDriveUrl || typeof googleDriveUrl !== 'string') {
    return '';
  }

  // Extract file ID from various Google Drive URL formats
  const fileId = extractFileId(googleDriveUrl);
  
  if (!fileId) {
    console.warn('Invalid Google Drive URL format:', googleDriveUrl);
    return googleDriveUrl; // Return original URL if we can't parse it
  }

  // Try multiple Google Drive URL formats for better compatibility
  const formats = [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`,
    `https://drive.google.com/uc?id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=view`
  ];

  // Return the first format (most common)
  return formats[0];
};

/**
 * Extracts file ID from various Google Drive URL formats
 * @param url - Google Drive URL
 * @returns File ID or null if not found
 */
export const extractFileId = (url: string): string | null => {
  // Common Google Drive URL patterns
  const patterns = [
    // https://drive.google.com/file/d/FILE_ID/view
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    // https://drive.google.com/open?id=FILE_ID
    /[?&]id=([a-zA-Z0-9-_]+)/,
    // https://docs.google.com/document/d/FILE_ID/edit
    /\/document\/d\/([a-zA-Z0-9-_]+)/,
    // https://docs.google.com/spreadsheets/d/FILE_ID/edit
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    // https://docs.google.com/presentation/d/FILE_ID/edit
    /\/presentation\/d\/([a-zA-Z0-9-_]+)/,
    // https://lh3.googleusercontent.com/d/FILE_ID
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/,
    // https://drive.usercontent.google.com/download?id=FILE_ID
    /drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9-_]+)/,
    // Direct file ID (if someone just passes the ID)
    /^([a-zA-Z0-9-_]+)$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  console.log('No file ID found');
  return null;
};

/**
 * Converts multiple Google Drive URLs in an object
 * @param obj - Object containing Google Drive URLs
 * @param fields - Array of field names that contain Google Drive URLs
 * @returns Object with converted URLs
 */
export const convertGoogleDriveUrlsInObject = (
  obj: Record<string, any>, 
  fields: string[] = ['logo', 'image', 'photo']
): Record<string, any> => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const converted = { ...obj };

  fields.forEach(field => {
    if (converted[field] && typeof converted[field] === 'string') {
      converted[field] = convertGoogleDriveUrl(converted[field]);
    }
  });

  return converted;
};

/**
 * Converts Google Drive URLs in an array of objects
 * @param array - Array of objects containing Google Drive URLs
 * @param fields - Array of field names that contain Google Drive URLs
 * @returns Array with converted URLs
 */
export const convertGoogleDriveUrlsInArray = (
  array: Record<string, any>[], 
  fields: string[] = ['logo', 'image', 'photo']
): Record<string, any>[] => {
  if (!Array.isArray(array)) {
    return array;
  }

  return array.map(item => convertGoogleDriveUrlsInObject(item, fields));
};

/**
 * Validates if a URL is a Google Drive URL
 * @param url - URL to validate
 * @returns True if it's a Google Drive URL
 */
export const isGoogleDriveUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const googleDrivePatterns = [
    /drive\.google\.com/,
    /docs\.google\.com/,
    /sheets\.google\.com/,
    /slides\.google\.com/,
    /lh3\.googleusercontent\.com/,
    /drive\.usercontent\.google\.com/
  ];

  return googleDrivePatterns.some(pattern => pattern.test(url));
};

/**
 * Gets different sizes of the same Google Drive image
 * @param googleDriveUrl - Original Google Drive URL
 * @param size - Size option: 'small', 'medium', 'large', 'original'
 * @returns URL for the specified size
 */
export const getGoogleDriveImageSize = (
  googleDriveUrl: string, 
  size: 'small' | 'medium' | 'large' | 'original' = 'original'
): string => {
  const fileId = extractFileId(googleDriveUrl);
  
  if (!fileId) {
    return googleDriveUrl;
  }

  const sizeParams: Record<string, string> = {
    small: 'w200-h200',
    medium: 'w400-h400',
    large: 'w800-h800',
    original: 'export=view'
  };

  const sizeParam = sizeParams[size] || sizeParams.original;
  
  return `https://drive.google.com/uc?${sizeParam}&id=${fileId}`;
};

