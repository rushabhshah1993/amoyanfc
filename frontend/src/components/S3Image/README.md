# S3 Image Component Documentation

## Overview

The S3Image component is a robust React component designed to handle S3-hosted images with advanced features including error handling, retry logic, loading states, and optimization.

## Features

### ✅ **Core Features**
- **S3 URL Validation**: Validates URLs to ensure they're proper S3 URLs
- **Automatic Optimization**: Adds query parameters for better performance
- **Retry Logic**: Automatically retries failed image loads
- **Loading States**: Shows loading spinners while images load
- **Error Handling**: Graceful fallback for failed images
- **Lazy Loading**: Optional lazy loading for better performance
- **Responsive**: Supports different sizes and aspect ratios

### ✅ **Performance Features**
- **Image Preloading**: Checks if images exist before displaying
- **Cache Optimization**: Adds cache control parameters
- **Format Optimization**: Supports WebP format for better compression
- **Quality Control**: Configurable image quality settings

## Usage

### Basic Usage

```tsx
import S3Image from '../components/S3Image/S3Image';

<S3Image
  src="https://amoyanfc-assets.s3.us-east-1.amazonaws.com/fighters/fighter-id-name/ai-fight-pose.png"
  alt="Fighter Image"
  width={120}
  height={120}
/>
```

### Advanced Usage

```tsx
<S3Image
  src={fighter.profileImage}
  alt={`${fighter.firstName} ${fighter.lastName}`}
  className="fighter-image"
  width={120}
  height={120}
  lazy={true}
  retryCount={3}
  retryDelay={1000}
  fallback={
    <div className="fighter-placeholder">
      <FontAwesomeIcon icon={faUser} />
    </div>
  }
  loading={
    <div className="fighter-loading">
      <FontAwesomeIcon icon={faSpinner} spin />
    </div>
  }
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | S3 image URL |
| `alt` | `string` | `''` | Alt text for accessibility |
| `className` | `string` | `''` | CSS class name |
| `style` | `React.CSSProperties` | `{}` | Inline styles |
| `width` | `number` | - | Image width in pixels |
| `height` | `number` | - | Image height in pixels |
| `lazy` | `boolean` | `true` | Enable lazy loading |
| `retryCount` | `number` | `2` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries (ms) |
| `fallback` | `ReactNode` | `null` | Fallback component for errors |
| `loading` | `ReactNode` | `null` | Loading component |
| `onError` | `function` | - | Error callback |
| `onLoad` | `function` | - | Load callback |

## S3 URL Format

The component expects S3 URLs in the following format:

```
https://amoyanfc-assets.s3.us-east-1.amazonaws.com/fighters/{fighterId}-{firstName}-{lastName}/ai-fight-pose.png
```

### Example:
```
https://amoyanfc-assets.s3.us-east-1.amazonaws.com/fighters/676d7151eb38b2b97c6da955-anushka-kamat/ai-fight-pose.png
```

## Utility Functions

### `s3ImageUtils.ts`

The utility file provides helper functions for S3 image handling:

#### `isValidS3Url(url: string): boolean`
Validates if a URL is a proper S3 URL.

#### `optimizeS3Url(url: string, options?: S3ImageOptions, config?: S3ImageConfig): string`
Optimizes S3 URLs with query parameters for better performance.

#### `generateFighterImageUrl(fighterId: string, firstName: string, lastName: string, imageName?: string): string`
Generates fighter image URLs based on the naming convention.

#### `checkImageExists(url: string): Promise<boolean>`
Checks if an image exists by attempting to load it.

#### `FighterImageUtils`
Specialized utilities for fighter images:

- `getProfileImageUrl()`: Gets optimized fighter profile image URL
- `isValidFighterImageUrl()`: Validates fighter image URLs
- `parseFighterImageUrl()`: Extracts fighter info from image URLs

## Configuration

### Default S3 Configuration

```typescript
const DEFAULT_S3_CONFIG: S3ImageConfig = {
  bucket: 'amoyanfc-assets',
  region: 'us-east-1',
  baseUrl: 'https://amoyanfc-assets.s3.us-east-1.amazonaws.com',
  cacheMaxAge: 31536000, // 1 year
  enableOptimization: true,
};
```

## Error Handling

The component handles various error scenarios:

1. **Invalid S3 URL**: Shows error message
2. **Image Not Found**: Retries loading, then shows fallback
3. **Network Errors**: Automatic retry with exponential backoff
4. **No Source**: Shows fallback component

## Performance Optimizations

### Image Optimization
- **WebP Format**: Automatically uses WebP for better compression
- **Quality Control**: Configurable quality (default: 85%)
- **Size Optimization**: Adds width/height parameters
- **Cache Control**: Adds cache headers for better performance

### Loading Optimizations
- **Lazy Loading**: Images load only when needed
- **Preloading**: Checks image existence before display
- **Retry Logic**: Handles temporary network issues
- **Loading States**: Shows spinners during load

## CSS Classes

The component uses the following CSS classes:

- `.s3-image`: Base image class
- `.s3-image.loaded`: Applied when image loads successfully
- `.s3-image-loading`: Loading state container
- `.s3-image-error`: Error state container
- `.fighter-image`: Specific styling for fighter images
- `.fighter-placeholder`: Fallback placeholder
- `.fighter-loading`: Loading state for fighters

## Browser Support

- **Modern Browsers**: Full support with all features
- **Older Browsers**: Graceful degradation with fallbacks
- **Mobile**: Optimized for mobile performance
- **Accessibility**: Full ARIA support and keyboard navigation

## Integration Examples

### With Fighter Data

```tsx
{fighters.map((fighter) => (
  <div key={fighter.id} className="fighter-card">
    <S3Image
      src={fighter.profileImage}
      alt={`${fighter.firstName} ${fighter.lastName}`}
      className="fighter-image"
      width={120}
      height={120}
      fallback={<FighterPlaceholder />}
    />
    <h3>{fighter.firstName} {fighter.lastName}</h3>
  </div>
))}
```

### With Error Boundaries

```tsx
<ErrorBoundary fallback={<ImageErrorFallback />}>
  <S3Image
    src={imageUrl}
    alt="Important Image"
    retryCount={5}
    retryDelay={2000}
  />
</ErrorBoundary>
```

## Troubleshooting

### Common Issues

1. **Images Not Loading**
   - Check S3 URL format
   - Verify S3 bucket permissions
   - Check network connectivity

2. **Slow Loading**
   - Enable lazy loading
   - Use appropriate image sizes
   - Check S3 region configuration

3. **Fallback Not Showing**
   - Ensure fallback component is provided
   - Check CSS styling
   - Verify error handling logic

### Debug Mode

Enable debug logging by setting:

```typescript
console.log('S3 Image Debug:', {
  originalUrl: src,
  optimizedUrl: imageUrl,
  isValid: isValidS3Url(src),
  exists: await checkImageExists(imageUrl)
});
```

## Future Enhancements

- **Progressive Loading**: Show low-quality images first
- **Image Caching**: Local storage caching
- **CDN Integration**: Support for CloudFront
- **Analytics**: Image load performance tracking
- **A/B Testing**: Different image formats based on browser support
