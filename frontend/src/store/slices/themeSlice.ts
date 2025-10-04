import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ThemeState {
    isDarkMode: boolean;
}

// Load theme preference from localStorage on initialization
const getInitialTheme = (): boolean => {
    try {
        const savedTheme = localStorage.getItem('amoyanfc-theme');
        if (savedTheme !== null) {
            return JSON.parse(savedTheme);
        }
    } catch (error) {
        console.warn('Failed to load theme preference from localStorage:', error);
    }
    return false; // Default to light theme
};

const initialState: ThemeState = {
    isDarkMode: getInitialTheme()
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.isDarkMode = !state.isDarkMode;
            // Save to localStorage
            try {
                localStorage.setItem('amoyanfc-theme', JSON.stringify(state.isDarkMode));
            } catch (error) {
                console.warn('Failed to save theme preference to localStorage:', error);
            }
        },
        setTheme: (state, action: PayloadAction<boolean>) => {
            state.isDarkMode = action.payload;
            // Save to localStorage
            try {
                localStorage.setItem('amoyanfc-theme', JSON.stringify(state.isDarkMode));
            } catch (error) {
                console.warn('Failed to save theme preference to localStorage:', error);
            }
        }
    }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
