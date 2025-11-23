// Use Cloud Run's PORT env var (defaults to 8080) or fallback to 4000 for local dev
export const PORT = process.env.PORT || 4000;

// Compeitition Types
export const COMPETITION_TYPES = {
    LEAGUE: 'league',
    CUP: 'cup'
};

// Stages
export const CUP_STAGES = {
    NOT_STARTED: 'not_started',
    PRELIMINARY: 'preliminary',
    SEMIFINALS: 'semifinals',
    FINALS: 'finals',
    COMPLETED: 'completed',
};

// Default Config Values
export const DEFAULT_CONFIG = {
    MAX_FIGHTERS: 16,
    POINTS_PER_WIN: 3,
};

// Singular keys for articles
export const SINGULAR_KEYS = [
    'tags',
    'from',
    'to'
];

