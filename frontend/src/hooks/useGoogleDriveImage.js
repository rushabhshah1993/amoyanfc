import { useState, useEffect } from 'react';
import { convertGoogleDriveUrl, isGoogleDriveUrl } from '../utils/googleDriveUtils';

/**
 * Custom hook for handling Google Drive images
 * @param {string} originalUrl - The original image URL
 * @param {string} size - Image size: 'small', 'medium', 'large', 'original'
 * @returns {Object} - { imageUrl, isLoading, error }
 */
export const useGoogleDriveImage = (originalUrl, size = 'original') => {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!originalUrl) {
      setImageUrl('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let processedUrl = originalUrl;

      // Convert Google Drive URL if needed
      if (isGoogleDriveUrl(originalUrl)) {
        processedUrl = convertGoogleDriveUrl(originalUrl);
        console.log('Google Drive URL conversion:', {
          original: originalUrl,
          converted: processedUrl
        });
      }

      setImageUrl(processedUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Error in useGoogleDriveImage:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [originalUrl, size]);

  return { imageUrl, isLoading, error };
};

/**
 * Hook for handling multiple Google Drive images
 * @param {Array<string>} urls - Array of image URLs
 * @param {string} size - Image size
 * @returns {Object} - { imageUrls, isLoading, errors }
 */
export const useGoogleDriveImages = (urls = [], size = 'original') => {
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!urls.length) {
      setImageUrls([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const processedUrls = urls.map(url => {
        if (isGoogleDriveUrl(url)) {
          return convertGoogleDriveUrl(url);
        }
        return url;
      });

      setImageUrls(processedUrls);
      setIsLoading(false);
    } catch (err) {
      setErrors([err.message]);
      setIsLoading(false);
    }
  }, [urls, size]);

  return { imageUrls, isLoading, errors };
};
