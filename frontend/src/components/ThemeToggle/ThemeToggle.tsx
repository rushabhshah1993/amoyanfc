import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isDarkMode } = useAppSelector((state) => state.theme);

    const handleToggle = () => {
        dispatch(toggleTheme());
    };

    return (
        <button 
            onClick={handleToggle}
            className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
        </button>
    );
};

export default ThemeToggle;
