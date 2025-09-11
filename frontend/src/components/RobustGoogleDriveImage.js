import React, { useState, useEffect } from 'react';
import { extractFileId } from '../utils/googleDriveUtils';

/**
 * Google Drive Image component that converts sharing URLs to direct view format
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
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert Google Drive URL to direct view format
  const convertToDirectUrl = (originalUrl) => {
    const fileId = extractFileId(originalUrl);
    if (!fileId) {
      // If we can't extract a file ID, return the original URL
      return originalUrl;
    } 
    // Convert to direct view format
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  };

  useEffect(() => {
    if (!src) {
      setImageUrl('');
      setIsLoading(false);
      return;
    }

    const directUrl = convertToDirectUrl(src);
    setImageUrl(directUrl);
    setIsLoading(true);
    setError(null);
  }, [src]);

  const handleError = (e) => {
    console.warn('Failed to load image:', imageUrl);
    console.warn('Original URL:', src);
    setError('Failed to load image');
    setIsLoading(false);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e) => {
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
