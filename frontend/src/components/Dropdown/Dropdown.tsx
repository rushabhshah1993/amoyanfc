import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import styles from './Dropdown.module.css';

export interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: number;
  align?: 'left' | 'right';
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  maxHeight = 240,
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div 
      className={`${styles.dropdown} ${className} ${disabled ? styles.disabled : ''}`}
      ref={dropdownRef}
    >
      <button
        className={`${styles.dropdownButton} ${isOpen ? styles.open : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        type="button"
      >
        <span className={styles.buttonText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FontAwesomeIcon 
          icon={isOpen ? faChevronUp : faChevronDown} 
          className={styles.chevronIcon}
        />
      </button>
      
      {isOpen && (
        <div 
          className={`${styles.dropdownMenu} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              className={`${styles.dropdownItem} ${option.value === value ? styles.active : ''}`}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

