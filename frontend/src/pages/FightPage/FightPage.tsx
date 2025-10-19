import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHT_BY_ID, GET_FIGHTER_INFORMATION, GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import Performance from '../../components/Performance/Performance';
import styles from './FightPage.module.css';
import BodySilhouette from './BodySilhouette';

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
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('overview');

    // Fetch fight data
    const { loading, error, data } = useQuery(GET_FIGHT_BY_ID, {
        variables: { id: fightId },
        skip: !fightId
    });

    const fight: Fight | null = data?.getFightById || null;
    const fighter1 = fight?.fighter1 || null;
    const fighter2 = fight?.fighter2 || null;

    // Fetch full fighter data for both fighters (for Performance component)
    const { data: fighter1Data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter1?.id },
        skip: !fighter1?.id
    });

    const { data: fighter2Data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter2?.id },
        skip: !fighter2?.id
    });

    // Fetch all fighters for opponent lookups
    const { data: allFightersData } = useQuery(GET_ALL_FIGHTERS);

    const fighter1Full = fighter1Data?.getFighterInformation;
    const fighter2Full = fighter2Data?.getFighterInformation;
    const allFighters = allFightersData?.getAllFighters || [];

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

    if (loading) {
        return (
            <div className={styles.fightPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading fight...
                </div>
            </div>
        );
    }

    if (error) {
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
                                    currentDivision={fight.competitionContext.divisionNumber}
                                    currentRound={fight.competitionContext.roundNumber}
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
                            {fight.competitionContext.divisionNumber && (
                                <> • Division {fight.competitionContext.divisionNumber}</>
                            )}
                            {fight.competitionContext.divisionName && (
                                <> ({fight.competitionContext.divisionName})</>
                            )}
                            <> • Round {fight.competitionContext.roundNumber}</>
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
                                    currentDivision={fight.competitionContext.divisionNumber}
                                    currentRound={fight.competitionContext.roundNumber}
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

