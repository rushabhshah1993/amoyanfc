import React, { useState, useEffect, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { isValidS3Url, optimizeS3Url, checkImageExists, getImageConfig } from '../../utils/s3ImageUtils';
import './S3Image.css';

// In-memory cache for preloaded images to avoid re-fetching
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in memory

interface S3ImageProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fallback?: ReactNode;
  loading?: ReactNode;
  width?: number;
  height?: number;
  lazy?: boolean;
  retryCount?: number;
  retryDelay?: number;
  disableHoverScale?: boolean;
}

/**
 * S3 Image component with robust error handling, loading states, and retry logic
 */
const S3Image: React.FC<S3ImageProps> = ({
  src,
  alt = '',
  className = '',
  style = {},
  onError,
  onLoad,
  fallback = null,
  loading = null,
  width,
  height,
  lazy = true,
  retryCount = 2,
  retryDelay = 1000,
  disableHoverScale = false,
  ...props
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);


  useEffect(() => {
    if (!src) {
      setImageUrl('');
      setIsLoading(false);
      setError('No image source provided');
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);
      setImageLoaded(false);

      try {
        // Check in-memory cache first
        const cached = imageCache.get(src);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          // Use cached URL
          setImageUrl(cached.url);
          // Image may already be in browser cache, so it should load quickly
          return;
        }

        // Validate S3 URL
        if (!isValidS3Url(src)) {
          console.warn('Invalid S3 URL provided:', src);
          setError('Invalid image URL');
          setIsLoading(false);
          return;
        }

        // Use the raw URL without optimization parameters
        // CloudFront may not have Lambda@Edge configured for image optimization
        setImageUrl(src);
        
        // Cache the URL
        imageCache.set(src, { url: src, timestamp: now });

        // Keep loading state true - it will be set to false when image loads via handleLoad
      } catch (err) {
        console.warn('Failed to load S3 image:', src, err);
        
        if (retryAttempts < retryCount) {
          // Retry loading the image
          setTimeout(() => {
            setRetryAttempts(prev => prev + 1);
          }, retryDelay);
        } else {
          setError('Failed to load image after retries');
          setIsLoading(false);
        }
      }
    };

    loadImage();
  }, [src, retryAttempts, retryCount, retryDelay, width, height]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('S3 Image load error:', imageUrl);
    setError('Failed to load image');
    setIsLoading(false);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoaded(true);
    setIsLoading(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show error state or fallback
  if (error || (!imageUrl && !isLoading)) {
    return fallback || (
      <div className={`s3-image-error ${className}`} style={style}>
        <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
        <span>Image unavailable</span>
      </div>
    );
  }

  // Show loading state only if no imageUrl yet
  if (isLoading && !imageUrl) {
    return loading || (
      <div className={`s3-image-loading ${className}`} style={style}>
        <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
        <span>Loading image...</span>
      </div>
    );
  }

  // Render the image (with loading indicator if still loading)
  return (
    <div className="s3-image-container" style={{ position: 'relative', display: 'inline-block' }}>
      {isLoading && !imageLoaded && (
        <div className="s3-image-loading-overlay">
          <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`s3-image ${className} ${imageLoaded ? 'loaded' : 'loading'} ${disableHoverScale ? 'no-hover-scale' : ''}`}
        style={{
          ...style,
          width: width ? `${width}px` : style.width,
          height: height ? `${height}px` : style.height,
          opacity: imageLoaded ? 1 : 0.3,
          transition: 'opacity 0.3s ease',
        }}
        onError={handleError}
        onLoad={handleLoad}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
    </div>
  );
};

export default S3Image;
