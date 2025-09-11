import React from 'react';
import { useGoogleDriveImage } from '../hooks/useGoogleDriveImage';

/**
 * Reusable component for displaying Google Drive images
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.size - Image size: 'small', 'medium', 'large', 'original'
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 * @param {Function} props.onError - Error handler
 * @param {Function} props.onLoad - Load handler
 * @param {React.ReactNode} props.fallback - Fallback content when image fails to load
 * @param {boolean} props.showLoading - Whether to show loading state
 * @returns {React.ReactElement} - Image component
 */
const GoogleDriveImage = ({
  src,
  alt = '',
  size = 'original',
  className = '',
  style = {},
  onError,
  onLoad,
  fallback = null,
  showLoading = false,
  ...props
}) => {
  const { imageUrl, isLoading, error } = useGoogleDriveImage(src, size);

  const handleError = (e) => {
    console.warn('Failed to load image:', imageUrl);
    console.warn('Original URL:', src);
    console.warn('Error details:', e);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e) => {
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show loading state
  if (isLoading && showLoading) {
    return (
      <div className={`google-drive-image-loading ${className}`} style={style}>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Show error state or fallback
  if (error || !imageUrl) {
    return fallback || (
      <div className={`google-drive-image-error ${className}`} style={style}>
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`google-drive-image ${className}`}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

export default GoogleDriveImage;
