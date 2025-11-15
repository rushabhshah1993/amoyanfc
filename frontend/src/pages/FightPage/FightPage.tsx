import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHT_BY_ID, GET_CUP_FIGHT_BY_ID, GET_FIGHTER_INFORMATION, GET_ALL_FIGHTERS, GET_SEASON_DETAILS, SIMULATE_FIGHT, GENERATE_FIGHT_WITH_WINNER, GET_ROUND_STANDINGS_BY_ROUND } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import Performance from '../../components/Performance/Performance';
import CompactHeadToHead from '../../components/CompactHeadToHead/CompactHeadToHead';
import styles from './FightPage.module.css';
import BodySilhouette from './BodySilhouette';

// Mock data for development/testing of scheduled fight UI
// Accessed via: http://localhost:3000/fight/scheduled-mock
// This allows testing the fight page UI without needing real fight data
import { mockScheduledFight } from '../../mocks/fight-scheduled.mock';
import FightGenerationLoader from '../../components/FightGenerationLoader/FightGenerationLoader';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface FightStatistics {
    fightTime?: number;
    finishingMove?: string;
    grappling?: {
        accuracy?: number;
        defence?: number;
    };
    significantStrikes?: {
        accuracy?: number;
        attempted?: number;
        defence?: number;
        landed?: number;
        landedPerMinute?: number;
        positions?: {
            clinching?: number;
            ground?: number;
            standing?: number;
        };
    };
    strikeMap?: {
        head?: { absorb?: number; strike?: number };
        torso?: { absorb?: number; strike?: number };
        leg?: { absorb?: number; strike?: number };
    };
    submissions?: {
        attemptsPer15Mins?: number;
        average?: number;
    };
    takedowns?: {
        accuracy?: number;
        attempted?: number;
        avgTakedownsLandedPerMin?: number;
        defence?: number;
        landed?: number;
    };
}

interface IndividualFighterStats {
    fighterId: string;
    stats: FightStatistics;
}

interface FightCompetitionContext {
    competitionId: string;
    competitionName: string;
    competitionLogo?: string;
    seasonNumber: number;
    divisionNumber?: number;
    divisionName?: string;
    roundNumber: number;
}

interface Fight {
    id: string;
    fighter1: Fighter;
    fighter2: Fighter;
    winner?: Fighter;
    fightIdentifier: string;
    date?: string;
    userDescription?: string;
    genAIDescription?: string;
    isSimulated: boolean;
    fighterStats?: IndividualFighterStats[];
    fightStatus: string;
    competitionContext: FightCompetitionContext;
}

const FightPage: React.FC = () => {
    const { fightId } = useParams<{ fightId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('overview');
    
    // State for scheduled fight actions
    const [actionMode, setActionMode] = useState<'none' | 'simulate' | 'chooseWinner'>('none');
    const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
    const [fightDescription, setFightDescription] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    // Check if this is a cup fight from navigation state
    const isCupFight = location.state?.isCupFight || false;
    
    // Determine competition type for Performance component
    const competitionType: 'league' | 'cup' = isCupFight ? 'cup' : 'league';
    
    // Development mode: Check if using mock data for UI testing
    // Access via: http://localhost:3000/fight/scheduled-mock
    const useMockData = fightId === 'scheduled-mock';

    // Fetch fight data using appropriate query (skip if using mock data)
    const { loading, error, data } = useQuery(isCupFight ? GET_CUP_FIGHT_BY_ID : GET_FIGHT_BY_ID, {
        variables: { id: fightId },
        skip: !fightId || useMockData
    });

    // Use mock data for development/testing, otherwise use real fight data from GraphQL
    const rawFight = useMockData ? mockScheduledFight : (data?.getCupFightById || data?.getFightById || null);
    
    
    // Extract fighter IDs for queries (works for both mock and real data)
    const fighter1Id = rawFight?.fighter1?.id;
    const fighter2Id = rawFight?.fighter2?.id;

    // Fetch full fighter data for both fighters (this works even with mock data)
    const { data: fighter1Data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter1Id },
        skip: !fighter1Id
    });

    const { data: fighter2Data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter2Id },
        skip: !fighter2Id
    });

    // Fetch full competition data (needed for season completion check)
    const competitionId = rawFight?.competitionContext?.competitionId;
    const { data: competitionData } = useQuery(GET_SEASON_DETAILS, {
        variables: { id: competitionId },
        skip: !competitionId || useMockData
    });

    // AI Fight Generation Mutations
    const [simulateFightMutation, { loading: simulatingFight }] = useMutation(SIMULATE_FIGHT);
    const [generateFightWithWinnerMutation, { loading: generatingFight }] = useMutation(GENERATE_FIGHT_WITH_WINNER);
    
    // Use real fighter data from MongoDB if available, otherwise fall back to mock/raw data
    const fighter1Full = fighter1Data?.getFighterInformation;
    const fighter2Full = fighter2Data?.getFighterInformation;
    const competitionFull = competitionData?.getCompetitionSeason;
    
    // Construct the fight object with real fighter data merged in
    const fight: Fight | null = rawFight ? {
        ...rawFight,
        fighter1: fighter1Full || rawFight.fighter1,
        fighter2: fighter2Full || rawFight.fighter2
    } : null;
    
    const fighter1 = fight?.fighter1 || null;
    const fighter2 = fight?.fighter2 || null;

    // Fetch all fighters for opponent lookups
    const { data: allFightersData } = useQuery(GET_ALL_FIGHTERS);
    const allFighters = allFightersData?.getAllFighters || [];

    // ============ TRANSFORM HEAD-TO-HEAD DATA FROM OPPONENTS HISTORY ============
    // Extract real head-to-head data from fighter's opponentsHistory
    const transformHeadToHeadData = () => {
        if (!fighter1Full?.opponentsHistory || !fighter1?.id || !fighter2?.id) return [];

        // Find the opponent history for fighter2 in fighter1's data
        const opponentHistory = fighter1Full.opponentsHistory.find(
            (oh: any) => oh.opponentId === fighter2.id
        );

        if (!opponentHistory || !opponentHistory.details || opponentHistory.details.length === 0) {
            return [];
        }

        // Debug: Log the first detail to see the actual field names

        // Group fights by competition
        const fightsByCompetition: { [key: string]: any } = {};

        opponentHistory.details.forEach((detail: any) => {
            const competitionId = detail.competitionId;
            
            if (!fightsByCompetition[competitionId]) {
                fightsByCompetition[competitionId] = {
                    competitionId,
                    fights: []
                };
            }

            const transformedFight = {
                winner: detail.isWinner ? fighter1!.id : fighter2!.id,
                season: detail.season,
                // Try both field name variations (division/divisionId, round/roundId)
                division: detail.division || detail.divisionId,
                round: detail.round || detail.roundId,
                fightId: detail.fightId
            };
            
            fightsByCompetition[competitionId].fights.push(transformedFight);
        });

        // Transform into CompactHeadToHead format with competition metadata
        const headToHeadData = Object.values(fightsByCompetition).map((comp: any) => {
            // Get competition metadata from fighter's competitionHistory
            const compMeta = fighter1Full.competitionHistory?.find(
                (ch: any) => ch.competitionId === comp.competitionId
            )?.competitionMeta;

            const fighter1Wins = comp.fights.filter((f: any) => f.winner === fighter1!.id).length;
            const fighter2Wins = comp.fights.filter((f: any) => f.winner === fighter2!.id).length;

            return {
                competitionId: comp.competitionId,
                competitionName: compMeta?.competitionName || 'Unknown Competition',
                competitionLogo: compMeta?.logo,
                totalFights: comp.fights.length,
                fighter1Wins,
                fighter2Wins,
                fights: comp.fights
            };
        });

        // Debug: Log the transformed head-to-head data
        
        return headToHeadData;
    };

    // Get real head-to-head data (only if we have fighter data loaded)
    const realHeadToHeadData = fighter1Full && fighter2Full ? transformHeadToHeadData() : [];

    // Scroll to top when component loads
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [fightId]);

    // Dynamically calculate and set the fighters comparison height based on header
    useEffect(() => {
        const updateContentHeight = () => {
            const header = document.querySelector('.header') as HTMLElement;
            if (header) {
                const headerHeight = header.offsetHeight;
                document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
            }
        };

        updateContentHeight();
        window.addEventListener('resize', updateContentHeight);

        return () => {
            window.removeEventListener('resize', updateContentHeight);
        };
    }, []);

    // Handle sticky header visibility on scroll
    useEffect(() => {
        const handleScroll = () => {
            const fightersComparisonSection = document.querySelector(`.${styles.fightersComparison}`) as HTMLElement;
            if (fightersComparisonSection) {
                const rect = fightersComparisonSection.getBoundingClientRect();
                const header = document.querySelector('.header') as HTMLElement;
                const headerHeight = header ? header.offsetHeight : 81;
                
                setShowStickyHeader(rect.bottom <= headerHeight);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Update page title when fight data is loaded
    useEffect(() => {
        if (fighter1 && fighter2 && fight?.competitionContext) {
            const ctx = fight.competitionContext;
            document.title = `Amoyan FC | ${fighter1.firstName} vs ${fighter2.firstName} - ${ctx.competitionName} S${ctx.seasonNumber}`;
        }
    }, [fighter1, fighter2, fight]);

    // Show loading only if not using mock data and the main query is loading
    // For mock data, we want to show fighter data as soon as it loads
    if (loading && !useMockData) {
        return (
            <div className={styles.fightPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading fight...
                </div>
            </div>
        );
    }

    // Only show error if not using mock data
    if (error && !useMockData) {
        return (
            <div className={styles.fightPage}>
                <button 
                    className={styles.backButton}
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <div className={styles.error}>
                    {error.message || 'Failed to load fight'}
                </div>
            </div>
        );
    }

    if (!fight) {
        return (
            <div className={styles.fightPage}>
                <button 
                    className={styles.backButton}
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <div className={styles.error}>
                    Fight not found
                </div>
            </div>
        );
    }

    // Helper functions to extract stats
    const getFighterStats = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string) => {
        return fighterStats?.find(fs => fs.fighterId === fighterId)?.stats;
    };

    const getTotalStrikes = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.landed || 0;
    };

    const getTotalTakedowns = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.landed || 0;
    };

    const getGrapplingAccuracy = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.grappling?.accuracy || 0;
    };

    const getGrapplingDefence = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.grappling?.defence || 0;
    };

    const getSubmissionAttempts = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.submissions?.attemptsPer15Mins || 0;
    };

    const getSubmissionAverage = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.submissions?.average || 0;
    };

    // Significant Strikes helper functions
    const getStrikesAccuracy = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.accuracy || 0;
    };

    const getStrikesAttempted = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.attempted || 0;
    };

    const getStrikesLanded = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.landed || 0;
    };

    const getStrikesDefence = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.defence || 0;
    };

    const getStrikesLandedPerMinute = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.landedPerMinute || 0;
    };

    const getStrikesStanding = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.positions?.standing || 0;
    };

    const getStrikesGround = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.positions?.ground || 0;
    };

    const getStrikesClinching = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.significantStrikes?.positions?.clinching || 0;
    };

    // Takedowns helper functions
    const getTakedownsAccuracy = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.accuracy || 0;
    };

    const getTakedownsAttempted = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.attempted || 0;
    };

    const getTakedownsAvgPerMin = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.avgTakedownsLandedPerMin || 0;
    };

    const getTakedownsLanded = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.landed || 0;
    };

    const getTakedownsDefence = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string): number => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.takedowns?.defence || 0;
    };

    // Strike Map helper functions
    const getStrikeMap = (fighterStats: IndividualFighterStats[] | undefined, fighterId: string) => {
        const stats = getFighterStats(fighterStats, fighterId);
        return stats?.strikeMap || { head: { absorb: 0, strike: 0 }, torso: { absorb: 0, strike: 0 }, leg: { absorb: 0, strike: 0 } };
    };

    // Calculate color intensity based on value ranking (highest = red, middle = yellow, lowest = green)
    const getBodyPartColor = (value: number, values: number[]): string => {
        const sorted = [...values].sort((a, b) => b - a); // Sort descending
        const rank = sorted.indexOf(value);
        
        if (rank === 0) return '#ef4444'; // Red - highest
        if (rank === 1) return '#f59e0b'; // Orange/Yellow - middle
        return '#22c55e'; // Green - lowest
    };

    const getBodyPartOpacity = (value: number, values: number[]): number => {
        const max = Math.max(...values);
        if (max === 0) return 0.3;
        const opacity = 0.3 + (value / max) * 0.7; // Range from 0.3 to 1.0
        return opacity;
    };

    // Render body silhouette with strike map
    const renderBodySilhouette = (strikeMap: any, type: 'strike' | 'absorb', fighterName: string) => {
        const headValue = strikeMap.head[type];
        const torsoValue = strikeMap.torso[type];
        const legValue = strikeMap.leg[type];
        const values = [headValue, torsoValue, legValue];

        const headColor = getBodyPartColor(headValue, values);
        const torsoColor = getBodyPartColor(torsoValue, values);
        const legColor = getBodyPartColor(legValue, values);

        const headOpacity = getBodyPartOpacity(headValue, values);
        const torsoOpacity = getBodyPartOpacity(torsoValue, values);
        const legOpacity = getBodyPartOpacity(legValue, values);

        return (
            <div className={styles.strikeMapContainer} key={`${fighterName}-${type}`}>
                <h5 className={styles.strikeMapTitle}>
                    {type === 'strike' ? 'Strikes Landed' : 'Strikes Absorbed'}
                </h5>
                <div className={styles.silhouetteWrapper}>
                    <BodySilhouette
                        headColor={headColor}
                        torsoColor={torsoColor}
                        legColor={legColor}
                        headOpacity={headOpacity}
                        torsoOpacity={torsoOpacity}
                        legOpacity={legOpacity}
                        id={`${fighterName}-${type}`}
                    />
                </div>
                <div className={styles.strikeMapLegend}>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: headColor, opacity: headOpacity }}></div>
                        <span>Head: {headValue}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: torsoColor, opacity: torsoOpacity }}></div>
                        <span>Torso: {torsoValue}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: legColor, opacity: legOpacity }}></div>
                        <span>Leg: {legValue}</span>
                    </div>
                </div>
            </div>
        );
    };

    // Render stat comparison bar
    const renderStatComparison = (label: string, fighter1Value: number, fighter2Value: number, unit: string = '') => {
        const total = fighter1Value + fighter2Value;
        const fighter1Percentage = total > 0 ? (fighter1Value / total) * 100 : 50;
        const fighter2Percentage = total > 0 ? (fighter2Value / total) * 100 : 50;

        return (
            <div className={styles.statComparison} key={label}>
                <div className={styles.statLabel}>{label}</div>
                <div className={styles.statBarContainer}>
                    <div className={styles.statValue}>{fighter1Value}{unit}</div>
                    <div className={styles.statBar}>
                        <div 
                            className={styles.statBarFighter1} 
                            style={{ width: `${fighter1Percentage}%` }}
                        />
                        <div 
                            className={styles.statBarFighter2} 
                            style={{ width: `${fighter2Percentage}%` }}
                        />
                    </div>
                    <div className={styles.statValue}>{fighter2Value}{unit}</div>
                </div>
            </div>
        );
    };

    // ============ AI FIGHT GENERATION HANDLERS ============
    
    const handleSimulateFightConfirm = async () => {
        if (!fight || !fighter1 || !fighter2 || !competitionFull) {
            alert('Fight data not available');
            return;
        }


        // Calculate the correct fightIndex from competition data
        let fightIndex = 0;
        
        if (isCupFight) {
            // For cup competitions, find fight in cupData.fights array
            const fights = competitionFull.cupData?.fights || [];
            fightIndex = fights.findIndex((f: any) => f._id === fightId || f.fightIdentifier === fight.fightIdentifier);
        } else {
            // For league competitions, find fight in division/round structure
            const division = competitionFull.leagueData?.divisions?.find(
                (d: any) => d.divisionNumber === fight.competitionContext.divisionNumber
            );
            
            if (division) {
                const round = division.rounds?.find(
                    (r: any) => r.roundNumber === fight.competitionContext.roundNumber
                );
                
                if (round) {
                    fightIndex = round.fights?.findIndex(
                        (f: any) => f._id === fightId || f.fightIdentifier === fight.fightIdentifier
                    ) || 0;
                }
            }
        }

        if (fightIndex === -1) {
            alert('Could not find fight in competition data. Please try again.');
            return;
        }


        try {
            setLoadingMessage('Preparing fight data...');
            
            // Simulate different stages with delays for user feedback
            setTimeout(() => setLoadingMessage('Contacting AI API...'), 500);
            setTimeout(() => setLoadingMessage('AI analyzing fighter statistics and styles...'), 1500);
            setTimeout(() => setLoadingMessage('Simulating fight outcome...'), 3000);
            setTimeout(() => setLoadingMessage('Generating detailed fight statistics...'), 5000);
            
            const result = await simulateFightMutation({
                variables: {
                    input: {
                        competitionId: fight.competitionContext.competitionId,
                        seasonNumber: fight.competitionContext.seasonNumber,
                        divisionNumber: fight.competitionContext.divisionNumber || null,
                        roundNumber: fight.competitionContext.roundNumber,
                        fightIndex,
                        fighter1Id: fighter1.id,
                        fighter2Id: fighter2.id,
                        fightDate: new Date().toISOString()
                    }
                },
                refetchQueries: [
                    { query: isCupFight ? GET_CUP_FIGHT_BY_ID : GET_FIGHT_BY_ID, variables: { id: fightId } },
                    { query: GET_SEASON_DETAILS, variables: { id: competitionId } },
                    // Refetch standings for league fights
                    ...(isCupFight ? [] : [{
                        query: GET_ROUND_STANDINGS_BY_ROUND,
                        variables: {
                            competitionId: fight.competitionContext.competitionId,
                            seasonNumber: fight.competitionContext.seasonNumber,
                            divisionNumber: fight.competitionContext.divisionNumber,
                            roundNumber: fight.competitionContext.roundNumber
                        }
                    }])
                ]
            });

            if (result.data?.simulateFight?.success) {
                
                setLoadingMessage('Fight simulated successfully!');
                setTimeout(() => {
                    setActionMode('none');
                    setLoadingMessage('');
                    alert('Fight simulated successfully! The AI has determined the winner and generated fight statistics.');
                }, 1000);
                // The page will automatically refresh with new data due to refetchQueries (including standings)
            } else {
                throw new Error(result.data?.simulateFight?.message || 'Failed to simulate fight');
            }
        } catch (error: any) {
            setLoadingMessage('');
            alert(`Error simulating fight: ${error.message || 'Unknown error'}`);
        }
    };

    const handleChooseWinnerSubmit = async () => {
        if (!selectedWinner || !fight || !fighter1 || !fighter2 || !competitionFull) {
            alert('Please select a winner and ensure fight data is available');
            return;
        }


        // Calculate the correct fightIndex from competition data
        let fightIndex = 0;
        
        if (isCupFight) {
            // For cup competitions, find fight in cupData.fights array
            const fights = competitionFull.cupData?.fights || [];
            fightIndex = fights.findIndex((f: any) => f._id === fightId || f.fightIdentifier === fight.fightIdentifier);
        } else {
            // For league competitions, find fight in division/round structure
            const division = competitionFull.leagueData?.divisions?.find(
                (d: any) => d.divisionNumber === fight.competitionContext.divisionNumber
            );
            
            if (division) {
                const round = division.rounds?.find(
                    (r: any) => r.roundNumber === fight.competitionContext.roundNumber
                );
                
                if (round) {
                    fightIndex = round.fights?.findIndex(
                        (f: any) => f._id === fightId || f.fightIdentifier === fight.fightIdentifier
                    ) || 0;
                }
            }
        }

        if (fightIndex === -1) {
            alert('Could not find fight in competition data. Please try again.');
            return;
        }


        try {
            setLoadingMessage('Preparing fight data with selected winner...');
            
            // Simulate different stages with delays for user feedback
            setTimeout(() => setLoadingMessage('Contacting AI API...'), 500);
            setTimeout(() => setLoadingMessage('AI generating fight narrative...'), 1500);
            setTimeout(() => setLoadingMessage('Calculating realistic fight statistics...'), 3000);
            setTimeout(() => setLoadingMessage('Validating fight data...'), 5000);
            
            const result = await generateFightWithWinnerMutation({
                variables: {
                    input: {
                        competitionId: fight.competitionContext.competitionId,
                        seasonNumber: fight.competitionContext.seasonNumber,
                        divisionNumber: fight.competitionContext.divisionNumber || null,
                        roundNumber: fight.competitionContext.roundNumber,
                        fightIndex,
                        fighter1Id: fighter1.id,
                        fighter2Id: fighter2.id,
                        winnerId: selectedWinner,
                        userDescription: fightDescription || null,
                        fightDate: new Date().toISOString()
                    }
                },
                refetchQueries: [
                    { query: isCupFight ? GET_CUP_FIGHT_BY_ID : GET_FIGHT_BY_ID, variables: { id: fightId } },
                    { query: GET_SEASON_DETAILS, variables: { id: competitionId } },
                    // Refetch standings for league fights
                    ...(isCupFight ? [] : [{
                        query: GET_ROUND_STANDINGS_BY_ROUND,
                        variables: {
                            competitionId: fight.competitionContext.competitionId,
                            seasonNumber: fight.competitionContext.seasonNumber,
                            divisionNumber: fight.competitionContext.divisionNumber,
                            roundNumber: fight.competitionContext.roundNumber
                        }
                    }])
                ]
            });

            if (result.data?.generateFightWithWinner?.success) {
                
                setLoadingMessage('Fight generated successfully!');
                setTimeout(() => {
                    setActionMode('none');
                    setSelectedWinner(null);
                    setFightDescription('');
                    setLoadingMessage('');
                    alert('Fight generated successfully! The AI has created fight statistics based on your selected winner.');
                }, 1000);
                // The page will automatically refresh with new data due to refetchQueries (including standings)
            } else {
                throw new Error(result.data?.generateFightWithWinner?.message || 'Failed to generate fight');
            }
        } catch (error: any) {
            setLoadingMessage('');
            alert(`Error generating fight: ${error.message || 'Unknown error'}`);
        }
    };

    const handleSimulateFightClick = () => {
        setActionMode('simulate');
        setSelectedWinner(null);
        setFightDescription('');
    };

    const handleChooseWinnerClick = () => {
        setActionMode('chooseWinner');
        setSelectedWinner(null);
        setFightDescription('');
    };

    const handleCancelAction = () => {
        setActionMode('none');
        setSelectedWinner(null);
        setFightDescription('');
    };

    return (
        <div className={styles.fightPage}>
            {/* Fight Generation Loading Overlay */}
            {(simulatingFight || generatingFight) && loadingMessage && (
                <FightGenerationLoader message={loadingMessage} />
            )}
            
            <button 
                className={styles.backButton}
                onClick={() => navigate(-1)}
                aria-label="Go back"
            >
                <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            {/* Sticky Header */}
            {fighter1 && fighter2 && (
                <div className={`${styles.stickyHeader} ${showStickyHeader ? styles.visible : ''}`}>
                    <button 
                        className={styles.stickyBackButton}
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>

                    <div className={styles.stickyContent}>
                        <div className={styles.stickyFighterInfo}>
                            <div className={styles.stickyFighterThumbnail}>
                                <S3Image
                                    src={fighter1?.profileImage}
                                    alt={`${fighter1?.firstName} ${fighter1?.lastName}`}
                                    className={styles.stickyFighterImage}
                                    width={50}
                                    height={50}
                                    lazy={false}
                                    disableHoverScale={true}
                                    fallback={
                                        <div className={styles.stickyImagePlaceholder}>
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                    }
                                />
                            </div>
                            <span className={styles.stickyFighterName}>
                                {fighter1?.firstName} {fighter1?.lastName}
                            </span>
                        </div>

                        <div className={styles.stickyVsDivider}>
                            <span className={styles.stickyVsText}>VS</span>
                        </div>

                        <div className={styles.stickyFighterInfo}>
                            <div className={styles.stickyFighterThumbnail}>
                                <S3Image
                                    src={fighter2?.profileImage}
                                    alt={`${fighter2?.firstName} ${fighter2?.lastName}`}
                                    className={styles.stickyFighterImage}
                                    width={50}
                                    height={50}
                                    lazy={false}
                                    disableHoverScale={true}
                                    fallback={
                                        <div className={styles.stickyImagePlaceholder}>
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                    }
                                />
                            </div>
                            <span className={styles.stickyFighterName}>
                                {fighter2?.firstName} {fighter2?.lastName}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Fight Layout: Fighter1 - Center Info - Fighter2 */}
            {fighter1 && fighter2 && (
                <div className={styles.fightMainSection}>
                    {/* Fighter 1 - Left */}
                    <div className={styles.fighterColumn}>
                        <div className={`${styles.fighterImageContainer} ${fight.winner?.id === fighter1.id ? styles.winnerImage : ''}`}>
                            <S3Image
                                src={fighter1.profileImage}
                                alt={`${fighter1.firstName} ${fighter1.lastName}`}
                                className={styles.fighterImage}
                                width={357}
                                height={459}
                                lazy={false}
                                disableHoverScale={true}
                                fallback={
                                    <div className={styles.imagePlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        <h2 className={styles.fighterName}>
                            {fighter1.firstName} {fighter1.lastName}
                        </h2>
                        <div className={styles.winnerTagContainer}>
                            {fight.winner?.id === fighter1.id && fight.fightStatus === 'completed' && (
                                <div className={styles.winnerTag}>WINNER</div>
                            )}
                        </div>
                        
                        {/* Performance Component for Fighter 1 */}
                        {fighter1Full && (
                            <div className={styles.fighterPerformance}>
                                <Performance 
                                    fighter={fighter1Full}
                                    allFighters={allFighters}
                                    competitionId={competitionFull?.competitionMetaId || fight.competitionContext.competitionId}
                                    competitionType={competitionType}
                                    currentSeason={fight.competitionContext.seasonNumber}
                                    currentDivision={isCupFight ? undefined : fight.competitionContext.divisionNumber}
                                    currentRound={isCupFight ? undefined : fight.competitionContext.roundNumber}
                                    count={5}
                                    showOpponentName={false}
                                    sortOrder="asc"
                                    title="Last 5 Fights"
                                />
                            </div>
                        )}
                    </div>

                    {/* Center Content - Info & Stats */}
                    <div className={styles.centerColumn}>
                        {/* Competition Info - Logo, Name, and Date inline */}
                        <div className={styles.competitionInfo}>
                            <div className={styles.competitionNameRow}>
                                {fight.competitionContext.competitionLogo && (
                                    <S3Image
                                        src={fight.competitionContext.competitionLogo}
                                        alt={fight.competitionContext.competitionName}
                                        className={styles.competitionLogo}
                                        width={40}
                                        height={40}
                                        lazy={false}
                                    />
                                )}
                                <h3 className={styles.competitionName}>
                                    {fight.competitionContext.competitionName}
                                </h3>
                            </div>
                            {fight.date && (
                                <div className={styles.fightDate}>
                                    {new Date(fight.date).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Season/Division/Round Info */}
                        <div className={styles.fightLocation}>
                            Season {fight.competitionContext.seasonNumber}
                            {isCupFight ? (
                                // Cup fight: Show stage name
                                fight.competitionContext.divisionName && (
                                    <> • {fight.competitionContext.divisionName === 'R1' ? 'Round 1' : 
                                          fight.competitionContext.divisionName === 'SF' ? 'Semifinal' :
                                          fight.competitionContext.divisionName === 'FN' ? 'Final' : 
                                          fight.competitionContext.divisionName}</>
                                )
                            ) : (
                                // League fight: Show division and round
                                <>
                                    {fight.competitionContext.divisionNumber && (
                                        <> • Division {fight.competitionContext.divisionNumber}</>
                                    )}
                                    {fight.competitionContext.divisionName && (
                                        <> ({fight.competitionContext.divisionName})</>
                                    )}
                                    {fight.competitionContext.roundNumber && (
                                        <> • Round {fight.competitionContext.roundNumber}</>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Compare Fighters Button */}
                        <button 
                            className={styles.compareButton}
                            onClick={() => navigate(`/versus/${fighter1.id}/${fighter2.id}`)}
                            aria-label="Compare fighters"
                        >
                            <FontAwesomeIcon icon={faBalanceScale} />
                            <span>Compare Fighters</span>
                        </button>

                        {/* Scheduled Fight UI: CompactHeadToHead */}
                        {fight.fightStatus === 'scheduled' && (
                            <div className={styles.scheduledFightSection}>
                                <CompactHeadToHead
                                    fighter1={fighter1}
                                    fighter2={fighter2}
                                    headToHeadData={realHeadToHeadData}
                                />
                            </div>
                        )}

                        {/* Scheduled Fight UI: Action Buttons */}
                        {fight.fightStatus === 'scheduled' && (
                            <div className={styles.scheduledActionButtons}>
                                <button 
                                    className={styles.actionButton}
                                    onClick={handleSimulateFightClick}
                                    disabled={actionMode !== 'none'}
                                >
                                    Simulate Fight
                                </button>
                                <button 
                                    className={styles.actionButton}
                                    onClick={handleChooseWinnerClick}
                                    disabled={actionMode !== 'none'}
                                >
                                    Choose Winner
                                </button>
                            </div>
                        )}

                        {/* Scheduled Fight UI: Action Panel */}
                        {fight.fightStatus === 'scheduled' && actionMode !== 'none' && (
                            <div className={styles.actionPanel}>
                                {actionMode === 'simulate' && (
                                    <div className={styles.simulateConfirmation}>
                                        <h4 className={styles.actionPanelTitle}>Simulate Fight</h4>
                                        <p className={styles.actionPanelText}>
                                            Are you sure you want to simulate this fight? The AI will generate fight statistics 
                                            and determine a winner based on fighter data.
                                        </p>
                                        <div className={styles.actionPanelButtons}>
                                            <button 
                                                className={styles.confirmButton}
                                                onClick={handleSimulateFightConfirm}
                                            >
                                                Confirm Simulation
                                            </button>
                                            <button 
                                                className={styles.cancelButton}
                                                onClick={handleCancelAction}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {actionMode === 'chooseWinner' && (
                                    <div className={styles.chooseWinnerPanel}>
                                        <h4 className={styles.actionPanelTitle}>Choose Winner</h4>
                                        <p className={styles.actionPanelText}>
                                            Select the winner of this fight and provide a description.
                                        </p>
                                        
                                        <div className={styles.winnerSelection}>
                                            <div 
                                                className={`${styles.winnerOption} ${selectedWinner === fighter1.id ? styles.selectedWinner : ''}`}
                                                onClick={() => setSelectedWinner(fighter1.id)}
                                            >
                                                <div className={styles.winnerThumbnail}>
                                                    <S3Image
                                                        src={fighter1.profileImage}
                                                        alt={`${fighter1.firstName} ${fighter1.lastName}`}
                                                        className={styles.winnerImage}
                                                        width={120}
                                                        height={120}
                                                        lazy={false}
                                                        fallback={
                                                            <div className={styles.winnerImagePlaceholder}>
                                                                <FontAwesomeIcon icon={faUser} />
                                                            </div>
                                                        }
                                                    />
                                                </div>
                                                <span className={styles.winnerName}>
                                                    {fighter1.firstName} {fighter1.lastName}
                                                </span>
                                            </div>
                                            
                                            <div 
                                                className={`${styles.winnerOption} ${selectedWinner === fighter2.id ? styles.selectedWinner : ''}`}
                                                onClick={() => setSelectedWinner(fighter2.id)}
                                            >
                                                <div className={styles.winnerThumbnail}>
                                                    <S3Image
                                                        src={fighter2.profileImage}
                                                        alt={`${fighter2.firstName} ${fighter2.lastName}`}
                                                        className={styles.winnerImage}
                                                        width={120}
                                                        height={120}
                                                        lazy={false}
                                                        fallback={
                                                            <div className={styles.winnerImagePlaceholder}>
                                                                <FontAwesomeIcon icon={faUser} />
                                                            </div>
                                                        }
                                                    />
                                                </div>
                                                <span className={styles.winnerName}>
                                                    {fighter2.firstName} {fighter2.lastName}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.descriptionInput}>
                                            <label htmlFor="fightDescription" className={styles.descriptionLabel}>
                                                Fight Description
                                            </label>
                                            <textarea
                                                id="fightDescription"
                                                className={styles.descriptionTextarea}
                                                placeholder="Describe what happened during the fight..."
                                                value={fightDescription}
                                                onChange={(e) => setFightDescription(e.target.value)}
                                                rows={6}
                                            />
                                        </div>
                                        
                                        <div className={styles.actionPanelButtons}>
                                            <button 
                                                className={styles.confirmButton}
                                                onClick={handleChooseWinnerSubmit}
                                                disabled={!selectedWinner}
                                            >
                                                Submit Result
                                            </button>
                                            <button 
                                                className={styles.cancelButton}
                                                onClick={handleCancelAction}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fight Time and Finishing Move */}
                        {fight.fightStatus === 'completed' && (
                            <div className={styles.fightDetails}>
                                <div className={styles.fightDetailItem}>
                                    <span className={styles.detailLabel}>Fight Time:</span>
                                    <span className={styles.detailValue}>
                                        {fight.fighterStats?.[0]?.stats?.fightTime 
                                            ? `${fight.fighterStats[0].stats.fightTime} min` 
                                            : 'N/A'}
                                    </span>
                                </div>
                                <div className={styles.fightDetailItem}>
                                    <span className={styles.detailLabel}>
                                        Finishing Move by {fight.winner?.firstName} {fight.winner?.lastName}:
                                    </span>
                                    <span className={styles.detailValue}>
                                        {(() => {
                                            // Find the winner's stats by matching fighterId with winner.id
                                            const winnerStats = fight.fighterStats?.find(
                                                fs => fs.fighterId === fight.winner?.id
                                            );
                                            return winnerStats?.stats?.finishingMove || 'N/A';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Conditional: Stats or Coming Soon */}
                        {fight.fightStatus === 'completed' ? (
                            <div className={styles.statsContainer}>
                                {/* Tabs Navigation */}
                                <div className={styles.tabsContainer}>
                                    <div className={styles.tabsNav}>
                                        <button
                                            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                                            onClick={() => setActiveTab('overview')}
                                        >
                                            Fight Overview
                                        </button>
                                        <button
                                            className={`${styles.tabButton} ${activeTab === 'strikes' ? styles.activeTab : ''}`}
                                            onClick={() => setActiveTab('strikes')}
                                        >
                                            Strikes
                                        </button>
                                        <button
                                            className={`${styles.tabButton} ${activeTab === 'grappling' ? styles.activeTab : ''}`}
                                            onClick={() => setActiveTab('grappling')}
                                        >
                                            Grappling
                                        </button>
                                        <button
                                            className={`${styles.tabButton} ${activeTab === 'description' ? styles.activeTab : ''}`}
                                            onClick={() => setActiveTab('description')}
                                        >
                                            Description
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    <div className={styles.tabContent}>
                                        {activeTab === 'overview' && (
                                            <div className={styles.overviewTab}>
                                                {renderStatComparison(
                                                    'Total Strikes',
                                                    getTotalStrikes(fight.fighterStats, fighter1.id),
                                                    getTotalStrikes(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Total Takedowns',
                                                    getTotalTakedowns(fight.fighterStats, fighter1.id),
                                                    getTotalTakedowns(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Grappling Accuracy',
                                                    getGrapplingAccuracy(fight.fighterStats, fighter1.id),
                                                    getGrapplingAccuracy(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                                {renderStatComparison(
                                                    'Grappling Defence',
                                                    getGrapplingDefence(fight.fighterStats, fighter1.id),
                                                    getGrapplingDefence(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                                {renderStatComparison(
                                                    'Submission Attempts (per 15 mins)',
                                                    getSubmissionAttempts(fight.fighterStats, fighter1.id),
                                                    getSubmissionAttempts(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Submission Average',
                                                    getSubmissionAverage(fight.fighterStats, fighter1.id),
                                                    getSubmissionAverage(fight.fighterStats, fighter2.id)
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'strikes' && (
                                            <div className={styles.overviewTab}>
                                                {/* Significant Strikes */}
                                                {renderStatComparison(
                                                    'Significant Strikes Accuracy',
                                                    getStrikesAccuracy(fight.fighterStats, fighter1.id),
                                                    getStrikesAccuracy(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                                {renderStatComparison(
                                                    'Significant Strikes Attempted',
                                                    getStrikesAttempted(fight.fighterStats, fighter1.id),
                                                    getStrikesAttempted(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Significant Strikes Landed',
                                                    getStrikesLanded(fight.fighterStats, fighter1.id),
                                                    getStrikesLanded(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Significant Strikes Defence',
                                                    getStrikesDefence(fight.fighterStats, fighter1.id),
                                                    getStrikesDefence(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                                {renderStatComparison(
                                                    'Strikes Landed Per Minute',
                                                    getStrikesLandedPerMinute(fight.fighterStats, fighter1.id),
                                                    getStrikesLandedPerMinute(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Strikes (Standing)',
                                                    getStrikesStanding(fight.fighterStats, fighter1.id),
                                                    getStrikesStanding(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Strikes (Ground)',
                                                    getStrikesGround(fight.fighterStats, fighter1.id),
                                                    getStrikesGround(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Strikes (Clinching)',
                                                    getStrikesClinching(fight.fighterStats, fighter1.id),
                                                    getStrikesClinching(fight.fighterStats, fighter2.id)
                                                )}
                                                
                                                {/* Takedowns */}
                                                {renderStatComparison(
                                                    'Takedown Accuracy',
                                                    getTakedownsAccuracy(fight.fighterStats, fighter1.id),
                                                    getTakedownsAccuracy(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                                {renderStatComparison(
                                                    'Takedowns Attempted',
                                                    getTakedownsAttempted(fight.fighterStats, fighter1.id),
                                                    getTakedownsAttempted(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Avg Takedowns Per Minute',
                                                    getTakedownsAvgPerMin(fight.fighterStats, fighter1.id),
                                                    getTakedownsAvgPerMin(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Takedowns Landed',
                                                    getTakedownsLanded(fight.fighterStats, fighter1.id),
                                                    getTakedownsLanded(fight.fighterStats, fighter2.id)
                                                )}
                                                {renderStatComparison(
                                                    'Takedown Defence',
                                                    getTakedownsDefence(fight.fighterStats, fighter1.id),
                                                    getTakedownsDefence(fight.fighterStats, fighter2.id),
                                                    '%'
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'grappling' && (
                                            <div className={styles.grapplingTab}>
                                                <div className={styles.strikeMapGrid}>
                                                    {/* Fighter 1 Strike Maps */}
                                                    <div className={styles.fighterStrikeMapSection}>
                                                        <h4 className={styles.fighterStrikeMapName}>
                                                            {fighter1.firstName} {fighter1.lastName}
                                                        </h4>
                                                        <div className={styles.strikeMapRow}>
                                                            {renderBodySilhouette(
                                                                getStrikeMap(fight.fighterStats, fighter1.id),
                                                                'strike',
                                                                fighter1.firstName
                                                            )}
                                                            {renderBodySilhouette(
                                                                getStrikeMap(fight.fighterStats, fighter1.id),
                                                                'absorb',
                                                                fighter1.firstName
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Fighter 2 Strike Maps */}
                                                    <div className={styles.fighterStrikeMapSection}>
                                                        <h4 className={styles.fighterStrikeMapName}>
                                                            {fighter2.firstName} {fighter2.lastName}
                                                        </h4>
                                                        <div className={styles.strikeMapRow}>
                                                            {renderBodySilhouette(
                                                                getStrikeMap(fight.fighterStats, fighter2.id),
                                                                'strike',
                                                                fighter2.firstName
                                                            )}
                                                            {renderBodySilhouette(
                                                                getStrikeMap(fight.fighterStats, fighter2.id),
                                                                'absorb',
                                                                fighter2.firstName
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {activeTab === 'description' && (
                                            <div className={styles.descriptionTab}>
                                                {fight.userDescription && (
                                                    <div className={styles.descriptionSection}>
                                                        <h4 className={styles.descriptionSectionTitle}>
                                                            Fight Description
                                                        </h4>
                                                        <p className={styles.descriptionSectionText}>
                                                            {fight.userDescription}
                                                        </p>
                                                    </div>
                                                )}
                                                {fight.genAIDescription && (
                                                    <div className={styles.descriptionSection}>
                                                        <div className={styles.aiDescriptionHeader}>
                                                            <h4 className={styles.descriptionSectionTitle}>
                                                                AI-Generated Description
                                                            </h4>
                                                            {fight.isSimulated && (
                                                                <span className={styles.simulatedBadgeSmall}>
                                                                    Simulated
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={styles.descriptionSectionText}>
                                                            {fight.genAIDescription}
                                                        </p>
                                                    </div>
                                                )}
                                                {!fight.userDescription && !fight.genAIDescription && (
                                                    <div className={styles.tabPlaceholder}>
                                                        No description available for this fight
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.comingSoon}>
                                <div className={styles.comingSoonIcon}>⏳</div>
                                <h3 className={styles.comingSoonTitle}>Coming Soon</h3>
                                <p className={styles.comingSoonText}>
                                    This fight hasn't taken place yet. Check back later for results.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Fighter 2 - Right */}
                    <div className={styles.fighterColumn}>
                        <div className={`${styles.fighterImageContainer} ${fight.winner?.id === fighter2.id ? styles.winnerImage : ''}`}>
                            <S3Image
                                src={fighter2.profileImage}
                                alt={`${fighter2.firstName} ${fighter2.lastName}`}
                                className={styles.fighterImage}
                                width={357}
                                height={459}
                                lazy={false}
                                disableHoverScale={true}
                                fallback={
                                    <div className={styles.imagePlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        <h2 className={styles.fighterName}>
                            {fighter2.firstName} {fighter2.lastName}
                        </h2>
                        <div className={styles.winnerTagContainer}>
                            {fight.winner?.id === fighter2.id && fight.fightStatus === 'completed' && (
                                <div className={styles.winnerTag}>WINNER</div>
                            )}
                        </div>
                        
                        {/* Performance Component for Fighter 2 */}
                        {fighter2Full && (
                            <div className={styles.fighterPerformance}>
                                <Performance 
                                    fighter={fighter2Full}
                                    allFighters={allFighters}
                                    competitionId={competitionFull?.competitionMetaId || fight.competitionContext.competitionId}
                                    competitionType={competitionType}
                                    currentSeason={fight.competitionContext.seasonNumber}
                                    currentDivision={isCupFight ? undefined : fight.competitionContext.divisionNumber}
                                    currentRound={isCupFight ? undefined : fight.competitionContext.roundNumber}
                                    count={5}
                                    showOpponentName={false}
                                    sortOrder="asc"
                                    title="Last 5 Fights"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FightPage;

