import React, { useState, useEffect, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { extractFileId } from '../../utils/googleDriveUtils';
import './RobustGoogleDriveImage.css';

interface RobustGoogleDriveImageProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fallback?: ReactNode;
}

/**
 * Google Drive Image component that converts sharing URLs to direct view format
 */
const RobustGoogleDriveImage: React.FC<RobustGoogleDriveImageProps> = ({
  src,
  alt = '',
  className = '',
  style = {},
  onError,
  onLoad,
  fallback = null,
  ...props
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Google Drive URL to direct view format
  const convertToDirectUrl = (originalUrl: string): string => {
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

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('Failed to load image:', imageUrl);
    console.warn('Original URL:', src);
    setError('Failed to load image');
    setIsLoading(false);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show loading state
  if (isLoading && imageUrl) {
    return (
      <div className={`robust-google-drive-image-loading ${className}`} style={style}>
        <FontAwesomeIcon icon={faImage} className="loading-icon" />
        <span>Loading...</span>
      </div>
    );
  }

  // Show error state or fallback
  if (error || (!imageUrl && !isLoading)) {
    return fallback || (
      <div className={`robust-google-drive-image-error ${className}`} style={style}>
        <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
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
