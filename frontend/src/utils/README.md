# Frontend Utilities

This directory contains utility functions for the Amoyan FC application.

## Available Utilities

### 1. Google Drive Image Utilities (`googleDriveUtils.ts`)
This utility provides functions to convert Google Drive image URLs to the proper format for direct viewing in web applications.

### 2. Round Standings Calculator (`standingsCalculator.ts`)
Comprehensive utility for calculating league standings with head-to-head tiebreaking logic. See [standingsCalculator.README.md](./standingsCalculator.README.md) for detailed documentation.

### 3. S3 Image Utilities (`s3ImageUtils.ts`)
Utilities for working with AWS S3 images and CloudFront CDN.

### 4. Country Flags Utilities (`countryFlags.ts`)
Utilities for displaying country flags based on country codes.

---

## Google Drive Image Utilities

Functions to convert Google Drive image URLs to the proper format for direct viewing in web applications.

## Features

- ✅ Convert Google Drive URLs to direct view format
- ✅ Support multiple Google Drive URL formats
- ✅ React hooks for easy integration
- ✅ Reusable components
- ✅ Error handling and fallbacks
- ✅ Multiple image sizes
- ✅ Batch processing for arrays and objects

## Usage Examples

### Basic URL Conversion

```javascript
import { convertGoogleDriveUrl } from '../utils/googleDriveUtils';

// Convert a Google Drive URL
const originalUrl = 'https://drive.google.com/file/d/1ABC123DEF456/view';
const directUrl = convertGoogleDriveUrl(originalUrl);
// Result: 'https://drive.google.com/uc?export=view&id=1ABC123DEF456'
```

### React Component Usage

```javascript
import GoogleDriveImage from '../components/GoogleDriveImage';

// In your component
<GoogleDriveImage
  src="https://drive.google.com/file/d/1ABC123DEF456/view"
  alt="Competition Logo"
  size="medium"
  fallback={<div>Logo unavailable</div>}
/>
```

### React Hook Usage

```javascript
import { useGoogleDriveImage } from '../hooks/useGoogleDriveImage';

function MyComponent({ imageUrl }) {
  const { imageUrl: processedUrl, isLoading, error } = useGoogleDriveImage(imageUrl);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <img src={processedUrl} alt="Image" />;
}
```

### Batch Processing

```javascript
import { convertGoogleDriveUrlsInArray } from '../utils/googleDriveUtils';

// Process an array of competitions
const competitions = [
  { name: 'League 1', logo: 'https://drive.google.com/file/d/123/view' },
  { name: 'League 2', logo: 'https://drive.google.com/file/d/456/view' }
];

const processedCompetitions = convertGoogleDriveUrlsInArray(competitions, ['logo']);
```

## Supported URL Formats

The utility automatically detects and converts these Google Drive URL formats:

- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://docs.google.com/document/d/FILE_ID/edit`
- `https://docs.google.com/spreadsheets/d/FILE_ID/edit`
- `https://docs.google.com/presentation/d/FILE_ID/edit`
- Direct file ID: `FILE_ID`

## Image Sizes

You can specify different image sizes:

- `small`: 200x200 pixels
- `medium`: 400x400 pixels  
- `large`: 800x800 pixels
- `original`: Full resolution

## Error Handling

The utilities include comprehensive error handling:

- Invalid URLs return the original URL
- Missing file IDs show warnings
- React components show fallback content
- Hooks provide error states

## API Reference

### `convertGoogleDriveUrl(url)`
Converts a single Google Drive URL to direct view format.

### `convertGoogleDriveUrlsInObject(obj, fields)`
Converts Google Drive URLs in specific fields of an object.

### `convertGoogleDriveUrlsInArray(array, fields)`
Converts Google Drive URLs in an array of objects.

### `isGoogleDriveUrl(url)`
Checks if a URL is a Google Drive URL.

### `getGoogleDriveImageSize(url, size)`
Gets a specific size of a Google Drive image.

### `useGoogleDriveImage(url, size)`
React hook for handling Google Drive images.

### `useGoogleDriveImages(urls, size)`
React hook for handling multiple Google Drive images.

### `<GoogleDriveImage />`
React component for displaying Google Drive images with error handling and fallbacks.
