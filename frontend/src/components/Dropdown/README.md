# Dropdown Component

A generic, reusable dropdown component with custom styling and scrollable content.

## Usage

```tsx
import Dropdown, { DropdownOption } from '../../components/Dropdown';

// Define your options
const options: DropdownOption[] = [
  { value: 1, label: 'Option 1' },
  { value: 2, label: 'Option 2' },
  { value: 3, label: 'Option 3' },
];

// Use in your component
<Dropdown
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  align="right"
  maxHeight={240}
  placeholder="Select an option..."
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `DropdownOption[]` | required | Array of options to display |
| `value` | `string \| number` | required | Currently selected value |
| `onChange` | `(value: string \| number) => void` | required | Callback when selection changes |
| `placeholder` | `string` | `'Select...'` | Text to show when no value is selected |
| `className` | `string` | `''` | Additional CSS class for the dropdown container |
| `disabled` | `boolean` | `false` | Whether the dropdown is disabled |
| `maxHeight` | `number` | `240` | Maximum height of the dropdown menu in pixels |
| `align` | `'left' \| 'right'` | `'right'` | Alignment of the dropdown menu |

## DropdownOption Interface

```typescript
interface DropdownOption {
  value: string | number;
  label: string;
}
```

## Features

- Custom styling matching the application's design system
- Scrollable content when options exceed `maxHeight`
- Click-outside-to-close functionality
- Keyboard accessible
- Responsive design
- Active state highlighting
- Smooth hover effects
- Disabled state support

## Examples

### Basic Usage
```tsx
const [selectedRound, setSelectedRound] = useState(1);

const roundOptions: DropdownOption[] = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `Round ${i + 1}`
}));

<Dropdown
  options={roundOptions}
  value={selectedRound}
  onChange={(value) => setSelectedRound(value as number)}
/>
```

### With String Values
```tsx
const [selectedStatus, setSelectedStatus] = useState('active');

const statusOptions: DropdownOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

<Dropdown
  options={statusOptions}
  value={selectedStatus}
  onChange={(value) => setSelectedStatus(value as string)}
  placeholder="Select status..."
/>
```

### Left-Aligned with Custom Height
```tsx
<Dropdown
  options={options}
  value={value}
  onChange={onChange}
  align="left"
  maxHeight={320}
  className={styles.customDropdown}
/>
```

### Disabled State
```tsx
<Dropdown
  options={options}
  value={value}
  onChange={onChange}
  disabled={true}
/>
```

