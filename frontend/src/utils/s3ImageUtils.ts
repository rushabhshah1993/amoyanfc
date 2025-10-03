import { getImageBaseUrl } from '../config/cloudfrontConfig';

export interface S3ImageConfig {
  bucket: string;
  region: string;
  baseUrl: string;
  cacheMaxAge?: number;
  enableOptimization?: boolean;
}

export interface S3ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  cache?: boolean;
}

/**
 * Default S3 configuration for AmoyanFC
 */
export const DEFAULT_S3_CONFIG: S3ImageConfig = {
  bucket: 'amoyanfc-assets',
  region: 'us-east-1',
  baseUrl: 'https://amoyanfc-assets.s3.us-east-1.amazonaws.com',
  cacheMaxAge: 31536000, // 1 year
  enableOptimization: true,
};

/**
 * CloudFront configuration for AmoyanFC
 * Replace YOUR_DISTRIBUTION_ID with your actual CloudFront distribution ID
 */
export const CLOUDFRONT_CONFIG: S3ImageConfig = {
  bucket: 'amoyanfc-assets',
  region: 'us-east-1',
  baseUrl: 'https://E2JUFP5XP02KD2.cloudfront.net', // TODO: Replace YOUR_DISTRIBUTION_ID with your actual CloudFront distribution ID
  cacheMaxAge: 31536000, // 1 year
  enableOptimization: true,
};

/**
 * Use CloudFront if available, otherwise fallback to S3
 */
export const getImageConfig = (): S3ImageConfig => {
  const baseUrl = getImageBaseUrl();
  return {
    bucket: 'amoyanfc-assets',
    region: 'us-east-1',
    baseUrl: baseUrl,
    cacheMaxAge: 31536000,
    enableOptimization: true,
  };
};

/**
 * Validates if a URL is a valid S3 URL
 */
export const isValidS3Url = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const s3Patterns = [
    /^https:\/\/.*\.s3\..*\.amazonaws\.com\//,
    /^https:\/\/.*\.amazonaws\.com\//,
    /^https:\/\/s3\..*\.amazonaws\.com\//,
  ];
  
  return s3Patterns.some(pattern => pattern.test(url));
};

/**
 * Optimizes S3 URL with query parameters for better performance
 */
export const optimizeS3Url = (
  url: string, 
  options: S3ImageOptions = {},
  config: S3ImageConfig = DEFAULT_S3_CONFIG
): string => {
  if (!isValidS3Url(url)) {
    console.warn('Invalid S3 URL provided:', url);
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // Add optimization parameters
    if (config.enableOptimization) {
      if (options.width) {
        urlObj.searchParams.set('w', options.width.toString());
      }
      if (options.height) {
        urlObj.searchParams.set('h', options.height.toString());
      }
      if (options.quality) {
        urlObj.searchParams.set('q', options.quality.toString());
      }
      if (options.format) {
        urlObj.searchParams.set('f', options.format);
      }
    }
    
    // Add cache control
    if (options.cache !== false) {
      urlObj.searchParams.set('cache', config.cacheMaxAge?.toString() || '31536000');
    }
    
    // Add timestamp for cache busting if needed
    if (options.cache === false) {
      urlObj.searchParams.set('t', Date.now().toString());
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error optimizing S3 URL:', error);
    return url;
  }
};

/**
 * Generates a fighter image URL based on the pattern used in the database
 */
export const generateFighterImageUrl = (
  fighterId: string,
  firstName: string,
  lastName: string,
  imageName: string = 'ai-fight-pose.png',
  config: S3ImageConfig = DEFAULT_S3_CONFIG
): string => {
  const folderName = `${fighterId}-${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  return `${config.baseUrl}/fighters/${folderName}/${imageName}`;
};

/**
 * Preloads an image and returns a promise
 */
export const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Checks if an image exists by attempting to load it
 */
export const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    await preloadImage(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Creates a responsive image URL for different screen sizes
 */
export const createResponsiveImageUrl = (
  baseUrl: string,
  sizes: { width: number; quality?: number }[],
  config: S3ImageConfig = DEFAULT_S3_CONFIG
): { url: string; width: number }[] => {
  return sizes.map(size => ({
    url: optimizeS3Url(baseUrl, {
      width: size.width,
      quality: size.quality || 80,
      format: 'webp',
    }, config),
    width: size.width,
  }));
};

/**
 * Fighter-specific image utilities
 */
export const FighterImageUtils = {
  /**
   * Gets the fighter's profile image URL with optimization
   */
  getProfileImageUrl: (
    fighterId: string,
    firstName: string,
    lastName: string,
    options: S3ImageOptions = {}
  ): string => {
    const baseUrl = generateFighterImageUrl(fighterId, firstName, lastName);
    return optimizeS3Url(baseUrl, {
      width: options.width || 120,
      height: options.height || 120,
      quality: options.quality || 85,
      format: options.format || 'webp',
      ...options,
    });
  },

  /**
   * Validates fighter image URL format
   */
  isValidFighterImageUrl: (url: string): boolean => {
    return isValidS3Url(url) && url.includes('/fighters/');
  },

  /**
   * Extracts fighter information from image URL
   */
  parseFighterImageUrl: (url: string): { fighterId?: string; firstName?: string; lastName?: string } | null => {
    if (!isValidS3Url(url) || !url.includes('/fighters/')) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fighterFolder = pathParts[pathParts.length - 2]; // Get folder name
      
      if (fighterFolder) {
        const parts = fighterFolder.split('-');
        if (parts.length >= 3) {
          return {
            fighterId: parts[0],
            firstName: parts[1],
            lastName: parts.slice(2).join('-'),
          };
        }
      }
    } catch (error) {
      console.error('Error parsing fighter image URL:', error);
    }

    return null;
  },
};

export default {
  isValidS3Url,
  optimizeS3Url,
  generateFighterImageUrl,
  preloadImage,
  checkImageExists,
  createResponsiveImageUrl,
  FighterImageUtils,
  DEFAULT_S3_CONFIG,
};
