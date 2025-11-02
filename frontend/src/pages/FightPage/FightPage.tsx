import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHT_BY_ID, GET_CUP_FIGHT_BY_ID, GET_FIGHTER_INFORMATION, GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import Performance from '../../components/Performance/Performance';
import CompactHeadToHead from '../../components/CompactHeadToHead/CompactHeadToHead';
import { prepareFightResultPayload } from '../../services/fightResultService';
import styles from './FightPage.module.css';
import BodySilhouette from './BodySilhouette';

// Mock data for testing scheduled fights - TO BE REMOVED LATER
import { mockScheduledFight } from '../../mocks/fight-scheduled.mock';

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

    // Check if this is a cup fight from navigation state
    const isCupFight = location.state?.isCupFight || false;
    
    // TEMPORARY: Check if using mock data
    const useMockData = fightId === 'scheduled-mock';

    // Fetch fight data using appropriate query (skip if using mock data)
    const { loading, error, data } = useQuery(isCupFight ? GET_CUP_FIGHT_BY_ID : GET_FIGHT_BY_ID, {
        variables: { id: fightId },
        skip: !fightId || useMockData
    });

    // TEMPORARY: Use mock data for testing scheduled fights
    // This will be removed once backend integration is complete
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
    
    // Use real fighter data from MongoDB if available, otherwise fall back to mock/raw data
    const fighter1Full = fighter1Data?.getFighterInformation;
    const fighter2Full = fighter2Data?.getFighterInformation;
    
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
        console.log('Head-to-Head Debug - First fight detail:', opponentHistory.details[0]);

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
        console.log('Head-to-Head Debug - Transformed data:', headToHeadData);
        
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

    // ============ HELPER FUNCTION TO PREPARE CHATGPT PAYLOAD ============
    const prepareFightPayload = (winnerId: string | null = null, description: string | null = null) => {
        if (!fighter1Full || !fighter2Full || !fighter1 || !fighter2) return null;

        // Helper to get last 5 fights for a fighter
        const getLastFiveFights = (fighterData: any) => {
            if (!fighterData.opponentsHistory) return [];

            // Flatten all fights from all opponents
            const allFights: any[] = [];
            fighterData.opponentsHistory.forEach((opponentHistory: any) => {
                if (opponentHistory.details) {
                    opponentHistory.details.forEach((detail: any) => {
                        // Find competition name from competitionHistory
                        const compMeta = fighterData.competitionHistory?.find(
                            (ch: any) => ch.competitionId === detail.competitionId
                        )?.competitionMeta;

                        allFights.push({
                            outcome: detail.isWinner ? 'win' : 'loss',
                            opponentId: opponentHistory.opponentId,
                            competitionName: compMeta?.competitionName || 'Unknown',
                            date: detail.date || null // Will need to add date field to GraphQL query if not present
                        });
                    });
                }
            });

            // Sort by date (most recent first) and take top 5
            // Note: If date is not available, we'll need to sort by season/round
            return allFights
                .filter(f => f.date)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);
        };

        // Helper to get current active streak
        const getCurrentStreak = (fighterData: any) => {
            if (!fighterData.streaks) return null;

            const activeStreak = fighterData.streaks.find((streak: any) => streak.active === true);
            if (!activeStreak) return null;

            return {
                type: activeStreak.type,
                count: activeStreak.count,
                startDate: activeStreak.start ? 
                    new Date(activeStreak.start.season, 0, 1).toISOString() : null, // Approximate date
                endDate: activeStreak.end ? 
                    new Date(activeStreak.end.season, 11, 31).toISOString() : null, // Approximate date
                active: activeStreak.active
            };
        };

        // Calculate head-to-head summary
        const headToHeadSummary = realHeadToHeadData.reduce((acc, comp) => {
            acc.totalFights += comp.totalFights;
            acc.fighter1Wins += comp.fighter1Wins;
            acc.fighter2Wins += comp.fighter2Wins;
            return acc;
        }, { totalFights: 0, fighter1Wins: 0, fighter2Wins: 0 });

        const payload = {
            fighter1Id: fighter1.id,
            fighter2Id: fighter2.id,
            winnerId: winnerId,
            userDescription: description,
            headToHead: headToHeadSummary,
            fighter1: {
                skillset: fighter1Full.skillset || [],
                physicalAttributes: fighter1Full.physicalAttributes || {},
                lastFiveFights: getLastFiveFights(fighter1Full),
                currentStreak: getCurrentStreak(fighter1Full)
            },
            fighter2: {
                skillset: fighter2Full.skillset || [],
                physicalAttributes: fighter2Full.physicalAttributes || {},
                lastFiveFights: getLastFiveFights(fighter2Full),
                currentStreak: getCurrentStreak(fighter2Full)
            }
        };

        return payload;
    };

    // ============ PLACEHOLDER API FUNCTIONS ============
    // These will be replaced with actual API calls later
    
    const handleSimulateFightConfirm = async () => {
        console.log('Simulating fight between:', fighter1?.firstName, 'and', fighter2?.firstName);
        
        // Prepare payload for ChatGPT
        const chatGPTPayload = prepareFightPayload(null, null); // No winner, no description for simulation
        console.log('ChatGPT Input Payload:', JSON.stringify(chatGPTPayload, null, 2));
        
        // TODO: Call OpenAI API to simulate fight
        // const chatGPTResponse = await simulateFightWithAI(chatGPTPayload);
        
        // MOCK: Simulate ChatGPT response for testing
        const mockChatGPTResponse = {
            winner: fighter1!.id, // Mock: fighter1 wins
            date: new Date().toISOString(),
            genAIDescription: "This is a simulated AI-generated fight description.",
            isSimulated: true,
            fighterStats: [
                {
                    fighterId: fighter1!.id,
                    stats: {
                        fightTime: 12.5,
                        finishingMove: "Armbar",
                        grappling: { accuracy: 80, defence: 10 },
                        significantStrikes: {
                            accuracy: 75,
                            attempted: 40,
                            defence: 9,
                            landed: 30,
                            landedPerMinute: 2.4,
                            positions: { clinching: 5, ground: 12, standing: 13 }
                        },
                        strikeMap: {
                            head: { absorb: 4, strike: 15 },
                            torso: { absorb: 2, strike: 10 },
                            leg: { absorb: 1, strike: 5 }
                        },
                        submissions: { attemptsPer15Mins: 2.5, average: 1.8 },
                        takedowns: {
                            accuracy: 65,
                            attempted: 5,
                            avgTakedownsLandedPerMin: 0.3,
                            defence: 2,
                            landed: 3
                        }
                    }
                },
                {
                    fighterId: fighter2!.id,
                    stats: {
                        fightTime: 12.5,
                        finishingMove: null,
                        grappling: { accuracy: 70, defence: 8 },
                        significantStrikes: {
                            accuracy: 68,
                            attempted: 35,
                            defence: 11,
                            landed: 24,
                            landedPerMinute: 1.9,
                            positions: { clinching: 4, ground: 9, standing: 11 }
                        },
                        strikeMap: {
                            head: { absorb: 6, strike: 10 },
                            torso: { absorb: 4, strike: 8 },
                            leg: { absorb: 2, strike: 6 }
                        },
                        submissions: { attemptsPer15Mins: 1.5, average: 1.0 },
                        takedowns: {
                            accuracy: 55,
                            attempted: 4,
                            avgTakedownsLandedPerMin: 0.2,
                            defence: 3,
                            landed: 2
                        }
                    }
                }
            ]
        };

        try {
            // Prepare MongoDB update payload
            const mongoDBPayload = prepareFightResultPayload(
                fightId!,
                fight!.competitionContext.competitionId,
                fight!.competitionContext.seasonNumber,
                fight!.competitionContext.divisionNumber!,
                fight!.competitionContext.roundNumber,
                fighter1Full,
                fighter2Full,
                mockChatGPTResponse
            );

            console.log('MongoDB Update Payload:', JSON.stringify(mongoDBPayload, null, 2));

            // TODO: Send to backend to update MongoDB
            // await updateFightResult(mongoDBPayload);

            setActionMode('none');
            alert('Fight simulated! Check console for MongoDB payload.');
        } catch (error) {
            console.error('Error preparing fight result:', error);
            alert('Error preparing fight result. Check console for details.');
        }
    };

    const handleChooseWinnerSubmit = async () => {
        if (!selectedWinner) {
            alert('Please select a winner');
            return;
        }
        
        console.log('Chosen winner:', selectedWinner);
        console.log('Fight description:', fightDescription);
        console.log('Fight ID:', fightId);
        
        // Prepare payload for ChatGPT (with winner and description)
        const chatGPTPayload = prepareFightPayload(
            selectedWinner, 
            fightDescription || null
        );
        console.log('ChatGPT Input Payload:', JSON.stringify(chatGPTPayload, null, 2));
        
        // TODO: Call OpenAI API to get fight stats based on winner
        // const chatGPTResponse = await generateFightStatsWithAI(chatGPTPayload);
        
        // MOCK: Simulate ChatGPT response with user-selected winner
        const mockChatGPTResponse = {
            winner: selectedWinner,
            date: new Date().toISOString(),
            userDescription: fightDescription || undefined,
            genAIDescription: "AI-generated analysis of the fight based on the outcome.",
            isSimulated: false, // User chose the winner
            fighterStats: [
                {
                    fighterId: fighter1!.id,
                    stats: {
                        fightTime: 14.0,
                        finishingMove: selectedWinner === fighter1!.id ? "Triangle Choke" : null,
                        grappling: { accuracy: 82, defence: 11 },
                        significantStrikes: {
                            accuracy: 77,
                            attempted: 42,
                            defence: 10,
                            landed: 32,
                            landedPerMinute: 2.3,
                            positions: { clinching: 6, ground: 13, standing: 13 }
                        },
                        strikeMap: {
                            head: { absorb: 5, strike: 14 },
                            torso: { absorb: 3, strike: 11 },
                            leg: { absorb: 2, strike: 7 }
                        },
                        submissions: { attemptsPer15Mins: 2.2, average: 1.6 },
                        takedowns: {
                            accuracy: 68,
                            attempted: 6,
                            avgTakedownsLandedPerMin: 0.29,
                            defence: 2,
                            landed: 4
                        }
                    }
                },
                {
                    fighterId: fighter2!.id,
                    stats: {
                        fightTime: 14.0,
                        finishingMove: selectedWinner === fighter2!.id ? "Knockout" : null,
                        grappling: { accuracy: 72, defence: 9 },
                        significantStrikes: {
                            accuracy: 70,
                            attempted: 37,
                            defence: 12,
                            landed: 26,
                            landedPerMinute: 1.9,
                            positions: { clinching: 5, ground: 10, standing: 11 }
                        },
                        strikeMap: {
                            head: { absorb: 7, strike: 11 },
                            torso: { absorb: 5, strike: 9 },
                            leg: { absorb: 3, strike: 6 }
                        },
                        submissions: { attemptsPer15Mins: 1.7, average: 1.2 },
                        takedowns: {
                            accuracy: 60,
                            attempted: 5,
                            avgTakedownsLandedPerMin: 0.21,
                            defence: 4,
                            landed: 3
                        }
                    }
                }
            ]
        };

        try {
            // Prepare MongoDB update payload
            const mongoDBPayload = prepareFightResultPayload(
                fightId!,
                fight!.competitionContext.competitionId,
                fight!.competitionContext.seasonNumber,
                fight!.competitionContext.divisionNumber!,
                fight!.competitionContext.roundNumber,
                fighter1Full,
                fighter2Full,
                mockChatGPTResponse
            );

            console.log('MongoDB Update Payload:', JSON.stringify(mongoDBPayload, null, 2));

            // TODO: Send to backend to update MongoDB
            // await updateFightResult(mongoDBPayload);
            
            setActionMode('none');
            setSelectedWinner(null);
            setFightDescription('');
            alert('Winner recorded! Check console for MongoDB payload.');
        } catch (error) {
            console.error('Error preparing fight result:', error);
            alert('Error preparing fight result. Check console for details.');
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
                                        {fight.fighterStats?.[0]?.stats?.finishingMove 
                                            ? fight.fighterStats[0].stats.finishingMove 
                                            : 'N/A'}
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

