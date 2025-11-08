import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTrophy, faMedal, faNewspaper, faHandFist, faCakeCandles, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_ALL_FIGHTERS_WITH_STATS, GET_ALL_ARTICLES, GET_ACTIVE_COMPETITIONS } from '../../services/queries';
import { getUpcomingFights } from '../../services/fightResultService';
import S3Image from '../../components/S3Image/S3Image';
import styles from './HomePage.module.css';

interface CompetitionHistory {
    competitionId: string;
    numberOfSeasonAppearances: number;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    dateOfBirth?: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    totalSeasons: number;
    totalOpponents: number;
    totalTitles: number;
    highestWinStreak: number;
    highestLoseStreak: number;
    globalRank?: {
        rank: number;
        score: number;
    };
    competitionHistory?: CompetitionHistory[];
}

interface UpcomingBirthday {
    fighters: Fighter[];
    daysUntil: number;
    isToday: boolean;
    nextBirthday: Date;
    birthdayDate: string;
    age: number;
}

interface Article {
    id: string;
    title: string;
    subtitle?: string;
    blurb?: string;
    thumbnail?: string;
    author?: string;
    tags?: string[];
    publishedDate?: string;
    fightersTagged?: string[];
}

interface ArticlesData {
    results: Article[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        count: number;
        has_next: boolean;
        has_previous: boolean;
    };
}

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
    const [currentBirthdayIndex, setCurrentBirthdayIndex] = useState(0);
    
    const { loading: loadingFighters, error: errorFighters, data: fightersData } = useQuery<{ getAllFightersWithBasicStats: Fighter[] }>(GET_ALL_FIGHTERS_WITH_STATS, {
        fetchPolicy: 'cache-first',
    });

    const { loading: loadingArticles, data: articlesData } = useQuery<{ getAllArticles: ArticlesData }>(GET_ALL_ARTICLES, {
        variables: { page: 1, limit: 3 },
        fetchPolicy: 'cache-first',
    });

    const { loading: loadingCompetitions, data: competitionsData } = useQuery(GET_ACTIVE_COMPETITIONS, {
        fetchPolicy: 'cache-first',
    });

    useEffect(() => {
        document.title = 'Amoyan FC | Home';
    }, []);

    // Get top 5 fighters based on global rank
    const topFighters = useMemo(() => {
        if (!fightersData?.getAllFightersWithBasicStats) return [];
        
        const fighters = fightersData.getAllFightersWithBasicStats;
        
        // Sort by global rank and get top 5
        return fighters
            .filter(f => f.globalRank && f.globalRank.rank > 0)
            .sort((a, b) => (a.globalRank?.rank || Infinity) - (b.globalRank?.rank || Infinity))
            .slice(0, 5)
            .map(fighter => ({
                ...fighter,
                rank: fighter.globalRank!.rank
            }));
    }, [fightersData]);

    const topArticles = articlesData?.getAllArticles?.results || [];

    // Get upcoming fights
    const upcomingFights = useMemo(() => {
        if (!competitionsData?.filterCompetitions) return [];
        return getUpcomingFights(competitionsData.filterCompetitions);
    }, [competitionsData]);

    // Calculate upcoming birthdays
    const upcomingBirthdays = useMemo(() => {
        if (!fightersData?.getAllFightersWithBasicStats) return [];

        const now = new Date();
        // Normalize today to midnight for accurate date comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentYear = today.getFullYear();

        // Group fighters by their birthday date
        const birthdayMap = new Map<string, { fighters: Fighter[], daysUntil: number, isToday: boolean, nextBirthday: Date }>();

        fightersData.getAllFightersWithBasicStats
            .filter(fighter => fighter.dateOfBirth)
            .forEach(fighter => {
                const dob = new Date(fighter.dateOfBirth!);
                const month = dob.getMonth();
                const day = dob.getDate();

                // Calculate this year's birthday
                let nextBirthday = new Date(currentYear, month, day);
                
                // If birthday has passed this year, use next year
                if (nextBirthday < today) {
                    nextBirthday = new Date(currentYear + 1, month, day);
                }

                // Calculate days until birthday
                const diffTime = nextBirthday.getTime() - today.getTime();
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isToday = daysUntil === 0;

                // Use date key to group fighters with same birthday
                const dateKey = `${month}-${day}`;

                if (!birthdayMap.has(dateKey)) {
                    birthdayMap.set(dateKey, {
                        fighters: [],
                        daysUntil,
                        isToday,
                        nextBirthday
                    });
                }

                birthdayMap.get(dateKey)!.fighters.push(fighter);
            });

        // Convert map to array and sort by days until birthday
        const birthdays: UpcomingBirthday[] = Array.from(birthdayMap.values())
            .map(group => {
                // Calculate age using the first fighter's DOB
                const firstFighter = group.fighters[0];
                const dob = new Date(firstFighter.dateOfBirth!);
                const age = group.nextBirthday.getFullYear() - dob.getFullYear();
                
                return {
                    fighters: group.fighters,
                    daysUntil: group.daysUntil,
                    isToday: group.isToday,
                    nextBirthday: group.nextBirthday,
                    birthdayDate: group.nextBirthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                    age
                };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 3);

        return birthdays;
    }, [fightersData]);

    // Auto-rotate articles every 5 seconds
    useEffect(() => {
        if (topArticles.length > 1) {
            const interval = setInterval(() => {
                setCurrentArticleIndex((prev) => (prev + 1) % topArticles.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [topArticles.length]);

    const handlePrevArticle = () => {
        setCurrentArticleIndex((prev) => (prev - 1 + topArticles.length) % topArticles.length);
    };

    const handleNextArticle = () => {
        setCurrentArticleIndex((prev) => (prev + 1) % topArticles.length);
    };

    const handlePrevBirthday = () => {
        setCurrentBirthdayIndex((prev) => (prev - 1 + upcomingBirthdays.length) % upcomingBirthdays.length);
    };

    const handleNextBirthday = () => {
        setCurrentBirthdayIndex((prev) => (prev + 1) % upcomingBirthdays.length);
    };

    const getBirthdayMessage = (birthday: UpcomingBirthday) => {
        const count = birthday.fighters.length;
        const plural = count > 1 ? 'birthdays' : 'birthday';
        
        if (birthday.isToday) {
            return `It's ${count > 1 ? 'their' : birthday.fighters[0].firstName.endsWith('s') ? 'their' : 'their'} ${plural} today! 🎉 Turning ${birthday.age}`;
        } else if (birthday.daysUntil === 1) {
            return `${birthday.birthdayDate} • Tomorrow • Turning ${birthday.age}`;
        } else {
            return `${birthday.birthdayDate} • ${birthday.daysUntil} days away • Turning ${birthday.age}`;
        }
    };

    if (loadingFighters) return (
        <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
            <p>Loading...</p>
        </div>
    );
    
    if (errorFighters) return <div className={styles.error}>Error: {errorFighters.message}</div>;

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return <FontAwesomeIcon icon={faTrophy} className={styles.goldMedal} />;
        } else if (rank === 2) {
            return <FontAwesomeIcon icon={faMedal} className={styles.silverMedal} />;
        } else if (rank === 3) {
            return <FontAwesomeIcon icon={faMedal} className={styles.bronzeMedal} />;
        }
        return null;
    };

    const currentArticle = topArticles[currentArticleIndex];
    const currentBirthday = upcomingBirthdays[currentBirthdayIndex];

    return (
        <div className={styles.homePage}>
            <div className={styles.homeContent}>
                {/* Row 1: Articles Marquee (70%) and Upcoming Fights (30%) */}
                <div className={styles.row1}>
                    {/* Articles Marquee */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <FontAwesomeIcon icon={faNewspaper} className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Latest Articles</h3>
                        </div>
                        {loadingArticles ? (
                            <div className={styles.marqueeLoading}>
                                <FontAwesomeIcon icon={faSpinner} spin />
                            </div>
                        ) : topArticles.length > 0 ? (
                            <div className={styles.marqueeContainer}>
                                <button className={`${styles.marqueeNav} ${styles.prev}`} onClick={handlePrevArticle}>
                                    <FontAwesomeIcon icon={faChevronLeft} />
                                </button>
                                <div 
                                    className={styles.articleCard}
                                    onClick={() => navigate(`/articles/${currentArticle.id}`)}
                                >
                                    {currentArticle.thumbnail && (
                                        <div className={styles.articleThumbnail}>
                                            <S3Image
                                                src={currentArticle.thumbnail}
                                                alt={currentArticle.title}
                                                className={styles.articleImage}
                                            />
                                        </div>
                                    )}
                                    <div className={styles.articleOverlay}></div>
                                    <div className={styles.articleContent}>
                                        <h3 className={styles.articleTitle}>{currentArticle.title}</h3>
                                        {currentArticle.blurb && (
                                            <p className={styles.articleBlurb}>{currentArticle.blurb}</p>
                                        )}
                                        {currentArticle.publishedDate && (
                                            <span className={styles.articleDate}>
                                                {new Date(currentArticle.publishedDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className={`${styles.marqueeNav} ${styles.next}`} onClick={handleNextArticle}>
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                                <div className={styles.marqueeIndicators}>
                                    {topArticles.map((_, index) => (
                                        <button
                                            key={index}
                                            className={`${styles.indicator} ${index === currentArticleIndex ? styles.active : ''}`}
                                            onClick={() => setCurrentArticleIndex(index)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.noContent}>
                                <FontAwesomeIcon icon={faNewspaper} />
                                <p>No articles available</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Fights */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <FontAwesomeIcon icon={faHandFist} className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Upcoming Fights</h3>
                        </div>
                        {loadingCompetitions ? (
                            <div className={styles.noContent}>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <p>Loading fights...</p>
                            </div>
                        ) : upcomingFights.length > 0 ? (
                            <div className={styles.upcomingFightsList}>
                                {upcomingFights.map((fight) => (
                                    <div 
                                        key={fight.fightId} 
                                        className={styles.upcomingFightCard}
                                        onClick={() => navigate(`/fight/${fight.fightId}`)}
                                    >
                                        <div className={styles.fightCompetitionHeader}>
                                            {fight.competitionLogo && (
                                                <img src={fight.competitionLogo} alt={fight.competitionName} className={styles.competitionLogo} />
                                            )}
                                            <span className={styles.competitionInfo}>
                                                {fight.competitionName} S{fight.seasonNumber}
                                                {fight.divisionName && ` • ${fight.divisionName}`}
                                            </span>
                                        </div>
                                        <div className={styles.fightMatchup}>
                                            <div className={styles.fightFighter}>
                                                {fight.fighter1.profileImage ? (
                                                    <div className={styles.fighterImageWrapper}>
                                                        <S3Image
                                                            src={fight.fighter1.profileImage}
                                                            alt={`${fight.fighter1.firstName} ${fight.fighter1.lastName}`}
                                                            className={styles.fighterImage}
                                                            disableHoverScale={true}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={styles.fighterImagePlaceholder}>
                                                        {fight.fighter1.firstName?.charAt(0)}{fight.fighter1.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                                <span className={styles.fighterName}>
                                                    {fight.fighter1.firstName} {fight.fighter1.lastName}
                                                </span>
                                            </div>
                                            <div className={styles.vsText}>VS</div>
                                            <div className={styles.fightFighter}>
                                                {fight.fighter2.profileImage ? (
                                                    <div className={styles.fighterImageWrapper}>
                                                        <S3Image
                                                            src={fight.fighter2.profileImage}
                                                            alt={`${fight.fighter2.firstName} ${fight.fighter2.lastName}`}
                                                            className={styles.fighterImage}
                                                            disableHoverScale={true}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={styles.fighterImagePlaceholder}>
                                                        {fight.fighter2.firstName?.charAt(0)}{fight.fighter2.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                                <span className={styles.fighterName}>
                                                    {fight.fighter2.firstName} {fight.fighter2.lastName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.fightDetails}>
                                            {fight.competitionType === 'league' && (
                                                <span>Round {fight.roundNumber}</span>
                                            )}
                                            {fight.competitionType === 'cup' && fight.roundName && (
                                                <span>{fight.roundName}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noContent}>
                                <FontAwesomeIcon icon={faHandFist} />
                                <p>No upcoming fights scheduled</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Top 5 Fighters (70%) and Upcoming Birthdays (30%) */}
                <div className={styles.row2}>
                    {/* Top 5 Fighters */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <FontAwesomeIcon icon={faTrophy} className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Top 5 Fighters</h3>
                        </div>
                        {topFighters.length === 0 ? (
                            <div className={styles.noContent}>
                                <FontAwesomeIcon icon={faTrophy} />
                                <p>No fighters available</p>
                            </div>
                        ) : (
                            <div className={styles.fightersList}>
                                {topFighters.map((fighter) => (
                                    <div 
                                        key={fighter.id} 
                                        className={`${styles.fighterItem} ${styles[`rank${fighter.rank}`]}`}
                                        onClick={() => navigate(`/fighter/${fighter.id}`)}
                                    >
                                        <div className={styles.fighterImageContainer}>
                                            {fighter.profileImage ? (
                                                <S3Image
                                                    src={fighter.profileImage}
                                                    alt={`${fighter.firstName} ${fighter.lastName}`}
                                                    className={styles.fighterFullImage}
                                                />
                                            ) : (
                                                <div className={styles.fighterImagePlaceholder}>
                                                    {fighter.firstName.charAt(0)}{fighter.lastName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.fighterOverlay}></div>
                                        <div className={styles.fighterInfo}>
                                            <div className={styles.fighterRank}>
                                                {getRankBadge(fighter.rank)}
                                                <span className={styles.rankNumber}>#{fighter.rank}</span>
                                            </div>
                                            <div className={styles.fighterName}>
                                                {fighter.firstName} {fighter.lastName}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Birthdays */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <FontAwesomeIcon icon={faCakeCandles} className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Upcoming Birthdays</h3>
                        </div>
                        {upcomingBirthdays.length === 0 ? (
                            <div className={styles.noContent}>
                                <FontAwesomeIcon icon={faCakeCandles} />
                                <p>No upcoming birthdays</p>
                            </div>
                        ) : (
                            <div className={styles.birthdayMarquee}>
                                {upcomingBirthdays.length > 1 && (
                                    <>
                                        <button className={`${styles.marqueeNav} ${styles.prev}`} onClick={handlePrevBirthday}>
                                            <FontAwesomeIcon icon={faChevronLeft} />
                                        </button>
                                        <button className={`${styles.marqueeNav} ${styles.next}`} onClick={handleNextBirthday}>
                                            <FontAwesomeIcon icon={faChevronRight} />
                                        </button>
                                    </>
                                )}
                                <div className={styles.birthdayCard}>
                                    <div className={styles.birthdayFighters}>
                                        {currentBirthday.fighters.map((fighter) => (
                                            <div 
                                                key={fighter.id}
                                                className={styles.birthdayFighterItem}
                                                onClick={() => navigate(`/fighter/${fighter.id}`)}
                                            >
                                                <div className={styles.birthdayImageContainer}>
                                                    {fighter.profileImage ? (
                                                        <S3Image
                                                            src={fighter.profileImage}
                                                            alt={`${fighter.firstName} ${fighter.lastName}`}
                                                            className={styles.birthdayImage}
                                                        />
                                                    ) : (
                                                        <div className={styles.birthdayImagePlaceholder}>
                                                            {fighter.firstName.charAt(0)}{fighter.lastName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.birthdayInfo}>
                                                    <h4 className={styles.birthdayName}>
                                                        {fighter.firstName} {fighter.lastName}
                                                    </h4>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className={styles.birthdayMessage}>
                                        {getBirthdayMessage(currentBirthday)}
                                    </p>
                                </div>
                                {upcomingBirthdays.length > 1 && (
                                    <div className={styles.marqueeIndicators}>
                                        {upcomingBirthdays.map((_, index) => (
                                            <button
                                                key={index}
                                                className={`${styles.indicator} ${index === currentBirthdayIndex ? styles.active : ''}`}
                                                onClick={() => setCurrentBirthdayIndex(index)}
                            />
                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
