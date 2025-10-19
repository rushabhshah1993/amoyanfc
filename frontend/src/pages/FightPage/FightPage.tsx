import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHT_BY_ID } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './FightPage.module.css';

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

    // Fetch fight data
    const { loading, error, data } = useQuery(GET_FIGHT_BY_ID, {
        variables: { id: fightId },
        skip: !fightId
    });

    const fight: Fight | null = data?.getFightById || null;
    const fighter1 = fight?.fighter1 || null;
    const fighter2 = fight?.fighter2 || null;

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

            {/* Fighter Comparison Section */}
            {fighter1 && fighter2 && (
                <div className={styles.fightersComparison}>
                    <div className={styles.fighterSection}>
                        <div className={styles.fighterImageContainer}>
                            <S3Image
                                src={fighter1.profileImage}
                                alt={`${fighter1.firstName} ${fighter1.lastName}`}
                                className={styles.fightFighterImage}
                                width={357}
                                height={459}
                                lazy={false}
                                disableHoverScale={true}
                                fallback={
                                    <div className={styles.fightImagePlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        <h2 className={styles.fighterName}>
                            {fighter1.firstName} {fighter1.lastName}
                        </h2>
                    </div>

                    <div className={styles.versusDivider}>
                        <span className={styles.versusText}>VS</span>
                    </div>

                    <div className={styles.fighterSection}>
                        <div className={styles.fighterImageContainer}>
                            <S3Image
                                src={fighter2.profileImage}
                                alt={`${fighter2.firstName} ${fighter2.lastName}`}
                                className={styles.fightFighterImage}
                                width={357}
                                height={459}
                                lazy={false}
                                disableHoverScale={true}
                                fallback={
                                    <div className={styles.fightImagePlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        <h2 className={styles.fighterName}>
                            {fighter2.firstName} {fighter2.lastName}
                        </h2>
                    </div>
                </div>
            )}

            {/* Fight Information Section */}
            <div className={styles.fightInfoSection}>
                <div className={styles.fightContext}>
                    {fight.competitionContext.competitionLogo && (
                        <S3Image
                            src={fight.competitionContext.competitionLogo}
                            alt={fight.competitionContext.competitionName}
                            className={styles.competitionLogo}
                            width={60}
                            height={60}
                            lazy={false}
                        />
                    )}
                    <div className={styles.contextDetails}>
                        <h3 className={styles.competitionName}>
                            {fight.competitionContext.competitionName}
                        </h3>
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
                    </div>
                </div>

                {fight.date && (
                    <div className={styles.fightDate}>
                        {new Date(fight.date).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                )}

                {fight.winner && (
                    <div className={styles.winnerBanner}>
                        <div className={styles.winnerLabel}>WINNER</div>
                        <div className={styles.winnerInfo}>
                            <S3Image
                                src={fight.winner.profileImage}
                                alt={`${fight.winner.firstName} ${fight.winner.lastName}`}
                                className={styles.winnerImage}
                                width={80}
                                height={80}
                                lazy={false}
                                fallback={
                                    <div className={styles.winnerImagePlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                            <div className={styles.winnerName}>
                                {fight.winner.firstName} {fight.winner.lastName}
                            </div>
                        </div>
                    </div>
                )}

                {(fight.userDescription || fight.genAIDescription) && (
                    <div className={styles.fightDescription}>
                        <h3 className={styles.descriptionTitle}>Fight Description</h3>
                        <p className={styles.descriptionText}>
                            {fight.userDescription || fight.genAIDescription}
                        </p>
                        {fight.isSimulated && (
                            <div className={styles.simulatedBadge}>
                                AI Simulated
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fight Stats Section - To be implemented */}
            <div className={styles.fightStatsSection}>
                <h2 className={styles.sectionTitle}>Fight Statistics</h2>
                <div className={styles.statsPlaceholder}>
                    Stats will be displayed here
                </div>
            </div>
        </div>
    );
};

export default FightPage;

