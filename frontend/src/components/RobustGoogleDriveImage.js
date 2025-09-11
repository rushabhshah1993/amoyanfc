import React, { useState, useEffect } from 'react';
import { extractFileId, isGoogleDriveUrl } from '../utils/googleDriveUtils';

/**
 * Robust Google Drive Image component that tries multiple URL formats
 */
const RobustGoogleDriveImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  onError,
  onLoad,
  fallback = null,
  ...props
}) => {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate multiple URL formats to try
  const generateUrlFormats = (originalUrl) => {
    if (!isGoogleDriveUrl(originalUrl)) {
      return [originalUrl];
    }

    const fileId = extractFileId(originalUrl);
    if (!fileId) {
      return [originalUrl];
    }

    return [
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`,
      `https://drive.google.com/uc?id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=view`,
      originalUrl // Fallback to original URL
    ];
  };

  useEffect(() => {
    if (!src) {
      setImageUrl('');
      setIsLoading(false);
      return;
    }

    const urlFormats = generateUrlFormats(src);
    setImageUrl(urlFormats[0]);
    setCurrentUrlIndex(0);
    setIsLoading(true);
    setError(null);
  }, [src]);

  const handleError = (e) => {
    const urlFormats = generateUrlFormats(src);
    const nextIndex = currentUrlIndex + 1;

    console.warn(`Failed to load image (attempt ${currentUrlIndex + 1}/${urlFormats.length}):`, imageUrl);

    if (nextIndex < urlFormats.length) {
      // Try next URL format
      setImageUrl(urlFormats[nextIndex]);
      setCurrentUrlIndex(nextIndex);
    } else {
      // All formats failed
      console.error('All Google Drive URL formats failed for:', src);
      setError('Failed to load image');
      setIsLoading(false);
      if (onError) {
        onError(e);
      }
    }
  };

  const handleLoad = (e) => {
    console.log('Successfully loaded image:', imageUrl);
    setIsLoading(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show error state or fallback
  if (error || (!imageUrl && !isLoading)) {
    return fallback || (
      <div className={`robust-google-drive-image-error ${className}`} style={style}>
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`robust-google-drive-image ${className}`}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

export default RobustGoogleDriveImage;
