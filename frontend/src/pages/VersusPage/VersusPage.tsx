import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION, GET_COMPETITION_META, GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import HeadToHead from '../../components/HeadToHead/HeadToHead';
import StatsComparison from '../../components/StatsComparison/StatsComparison';
import styles from './VersusPage.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    opponentsHistory?: OpponentHistory[];
    debutInformation?: {
        competitionId: string;
        season: number;
        fightId: string;
        dateOfDebut?: string;
        competitionMeta?: {
            id: string;
            competitionName: string;
            logo?: string;
        };
    };
}

interface OpponentHistory {
    opponentId: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    details: FightDetail[];
}

interface FightDetail {
    competitionId: string;
    season: number;
    division?: number;
    round: number;
    fightId: string;
    isWinner: boolean;
}

interface CompetitionHeadToHead {
    competitionId: string;
    competitionName: string;
    competitionLogo?: string;
    totalFights: number;
    fighter1Wins: number;
    fighter2Wins: number;
    fights: {
        winner: string; // fighter ID
        season: number;
        division?: number;
        round: number;
        fightId: string;
    }[];
}

const VersusPage: React.FC = () => {
    const { fighter1Id, fighter2Id } = useParams<{ fighter1Id: string; fighter2Id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [searchQuery1, setSearchQuery1] = useState('');
    const [searchQuery2, setSearchQuery2] = useState('');
    const [showDropdown1, setShowDropdown1] = useState(false);
    const [showDropdown2, setShowDropdown2] = useState(false);
    
    // Check if we're in compare mode via query param
    const isCompareMode = searchParams.get('compare') === 'true';
    
    // Scroll to top when component loads
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [fighter1Id, fighter2Id]);

    // Dynamically calculate and set the fighters comparison height based on header
    useEffect(() => {
        const updateContentHeight = () => {
            const header = document.querySelector('.header') as HTMLElement;
            if (header) {
                const headerHeight = header.offsetHeight;
                document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
            }
        };

        // Initial calculation
        updateContentHeight();

        // Recalculate on window resize
        window.addEventListener('resize', updateContentHeight);

        // Cleanup
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
                
                // Show sticky header when the main section is scrolled past the header
                setShowStickyHeader(rect.bottom <= headerHeight);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial state

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
    
    const [competitionNames, setCompetitionNames] = useState<Record<string, string>>({});
    const [competitionLogos, setCompetitionLogos] = useState<Record<string, string>>({});

    // Fetch all fighters for compare mode
    const { data: allFightersData } = useQuery(GET_ALL_FIGHTERS, {
        skip: !isCompareMode
    });

    // Fetch both fighters
    const { loading: loading1, error: error1, data: data1 } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter1Id },
        skip: !fighter1Id
    });

    const { loading: loading2, error: error2, data: data2 } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter2Id },
        skip: !fighter2Id
    });
    
    // Get fighters data
    const fighter1: Fighter | null = data1?.getFighterInformation || null;
    const fighter2: Fighter | null = data2?.getFighterInformation || null;
    
    // Pre-populate search inputs with fighter names when fighters are loaded (only once)
    useEffect(() => {
        if (fighter1 && isCompareMode) {
            setSearchQuery1(`${fighter1.firstName} ${fighter1.lastName}`);
        }
    }, [fighter1?.id, isCompareMode]); // Only re-run when fighter ID changes
    
    useEffect(() => {
        if (fighter2 && isCompareMode) {
            setSearchQuery2(`${fighter2.firstName} ${fighter2.lastName}`);
        }
    }, [fighter2?.id, isCompareMode]); // Only re-run when fighter ID changes
    
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(`.${styles.dropdownContainer}`)) {
                setShowDropdown1(false);
                setShowDropdown2(false);
            }
        };
        
        if (isCompareMode) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isCompareMode]);

    // Update page title when fighter data is loaded
    useEffect(() => {
        if (fighter1 && fighter2) {
            document.title = `Amoyan FC | ${fighter1.firstName} vs ${fighter2.firstName}`;
        }
    }, [fighter1, fighter2]);

    // Get head-to-head data from fighter1's opponentsHistory
    const opponentRecord = fighter1?.opponentsHistory?.find(
        oh => oh.opponentId === fighter2Id
    );

    // Fetch competition names and logos for all unique competition IDs
    useEffect(() => {
        const fetchCompetitionData = async () => {
            if (!opponentRecord || !opponentRecord.details) return;

            const uniqueCompIds = Array.from(new Set(opponentRecord.details.map(d => d.competitionId)));
            const names: Record<string, string> = {};
            const logos: Record<string, string> = {};

            for (const compId of uniqueCompIds) {
                try {
                    const response = await fetch(process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `
                                query GetCompetitionMeta($id: ID!) {
                                    getCompetitionMeta(id: $id) {
                                        id
                                        competitionName
                                        logo
                                    }
                                }
                            `,
                            variables: { id: compId }
                        }),
                        credentials: 'include'
                    });

                    const result = await response.json();
                    if (result.data?.getCompetitionMeta) {
                        names[compId] = result.data.getCompetitionMeta.competitionName;
                        logos[compId] = result.data.getCompetitionMeta.logo;
                    }
                } catch (error) {
                    console.error('Error fetching competition data:', error);
                    names[compId] = 'Unknown Competition';
                }
            }

            setCompetitionNames(names);
            setCompetitionLogos(logos);
        };

        fetchCompetitionData();
    }, [opponentRecord]);

    // Get all fighters and filter based on search (for compare mode)
    const allFighters: Fighter[] = allFightersData?.getAllFighters || [];
    const filteredFighters1 = allFighters.filter(f => {
        if (f.id === fighter2Id) return false;
        if (!searchQuery1.trim()) return true;
        return f.firstName.toLowerCase().includes(searchQuery1.toLowerCase()) ||
               f.lastName.toLowerCase().includes(searchQuery1.toLowerCase());
    });
    
    const filteredFighters2 = allFighters.filter(f => {
        if (f.id === fighter1Id) return false;
        if (!searchQuery2.trim()) return true;
        return f.firstName.toLowerCase().includes(searchQuery2.toLowerCase()) ||
               f.lastName.toLowerCase().includes(searchQuery2.toLowerCase());
    });
    
    // Handle fighter selection
    const handleFighter1Select = (fighterId: string) => {
        const fighter = allFighters.find(f => f.id === fighterId);
        if (fighter) {
            setSearchQuery1(`${fighter.firstName} ${fighter.lastName}`);
        }
        setShowDropdown1(false);
        // Navigate with the new fighter ID, keeping compare param
        if (fighter2Id) {
            navigate(`/versus/${fighterId}/${fighter2Id}?compare=true`);
        } else {
            navigate(`/versus/${fighterId}?compare=true`);
        }
    };
    
    const handleFighter2Select = (fighterId: string) => {
        const fighter = allFighters.find(f => f.id === fighterId);
        if (fighter) {
            setSearchQuery2(`${fighter.firstName} ${fighter.lastName}`);
        }
        setShowDropdown2(false);
        // Navigate with the new fighter ID, keeping compare param
        if (fighter1Id) {
            navigate(`/versus/${fighter1Id}/${fighterId}?compare=true`);
        } else {
            navigate(`/versus/${fighterId}?compare=true`);
        }
    };

    // Only show loading/error states if not in compare mode or if fighters are being loaded
    if (!isCompareMode) {
        if (loading1 || loading2) {
            return (
                <div className={styles.versusPage}>
                    <div className={styles.loading}>
                        <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                        Loading fighters...
                    </div>
                </div>
            );
        }

        if (error1 || error2) {
            return (
                <div className={styles.versusPage}>
                    <div className={styles.error}>
                        Error: {error1?.message || error2?.message}
                    </div>
                </div>
            );
        }

        if (!fighter1 || !fighter2) {
            return (
                <div className={styles.versusPage}>
                    <div className={styles.error}>
                        Fighters not found
                    </div>
                </div>
            );
        }
    }

    // Group fights by competition
    const getHeadToHeadByCompetition = (): CompetitionHeadToHead[] => {
        if (!opponentRecord || !opponentRecord.details || opponentRecord.details.length === 0 || !fighter1 || !fighter2) {
            return [];
        }

        const competitionMap = new Map<string, CompetitionHeadToHead>();

        opponentRecord.details.forEach(detail => {
            const compId = detail.competitionId;

            if (!competitionMap.has(compId)) {
                competitionMap.set(compId, {
                    competitionId: compId,
                    competitionName: competitionNames[compId] || 'Loading...',
                    competitionLogo: competitionLogos[compId],
                    totalFights: 0,
                    fighter1Wins: 0,
                    fighter2Wins: 0,
                    fights: []
                });
            }

            const comp = competitionMap.get(compId)!;
            comp.totalFights++;

            if (detail.isWinner) {
                comp.fighter1Wins++;
            } else {
                comp.fighter2Wins++;
            }

            comp.fights.push({
                winner: detail.isWinner ? fighter1!.id : fighter2!.id,
                season: detail.season,
                division: detail.division,
                round: detail.round,
                fightId: detail.fightId
            });
        });

        return Array.from(competitionMap.values());
    };

    const headToHeadData = getHeadToHeadByCompetition();
    const hasNoFights = headToHeadData.length === 0;

    return (
        <div className={styles.versusPage}>
            <button 
                className={styles.backButton}
                onClick={() => navigate(-1)}
                aria-label="Go back"
            >
                <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            {/* Fighter Selection Dropdowns (Compare Mode) */}
            {isCompareMode && (
                <div className={styles.compareSelectionContainer}>
                    <div className={styles.fighterSelectorsRow}>
                        <div className={styles.fighterSelector}>
                            <div className={styles.dropdownContainer}>
                                <input
                                    type="text"
                                    placeholder="Select Fighter 1..."
                                    value={searchQuery1}
                                    onChange={(e) => {
                                        setSearchQuery1(e.target.value);
                                        setShowDropdown1(true);
                                    }}
                                    onFocus={() => setShowDropdown1(true)}
                                    className={styles.searchInput}
                                />
                                {showDropdown1 && filteredFighters1.length > 0 && (
                                    <div className={styles.dropdown}>
                                        {filteredFighters1.map((fighter) => (
                                            <div
                                                key={fighter.id}
                                                className={styles.dropdownItem}
                                                onClick={() => handleFighter1Select(fighter.id)}
                                            >
                                                <div className={styles.dropdownFighterInfo}>
                                                    <S3Image
                                                        src={fighter.profileImage}
                                                        alt={`${fighter.firstName} ${fighter.lastName}`}
                                                        className={styles.dropdownFighterImage}
                                                        width={40}
                                                        height={40}
                                                        lazy={false}
                                                        disableHoverScale={true}
                                                        fallback={
                                                            <div className={styles.dropdownImagePlaceholder}>
                                                                <FontAwesomeIcon icon={faUser} />
                                                            </div>
                                                        }
                                                    />
                                                    <span className={styles.dropdownFighterName}>
                                                        {fighter.firstName} {fighter.lastName}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className={styles.vsDividerCompare}>VS</div>
                        
                        <div className={styles.fighterSelector}>
                            <div className={styles.dropdownContainer}>
                                <input
                                    type="text"
                                    placeholder="Select Fighter 2..."
                                    value={searchQuery2}
                                    onChange={(e) => {
                                        setSearchQuery2(e.target.value);
                                        setShowDropdown2(true);
                                    }}
                                    onFocus={() => setShowDropdown2(true)}
                                    className={styles.searchInput}
                                />
                                {showDropdown2 && filteredFighters2.length > 0 && (
                                    <div className={styles.dropdown}>
                                        {filteredFighters2.map((fighter) => (
                                            <div
                                                key={fighter.id}
                                                className={styles.dropdownItem}
                                                onClick={() => handleFighter2Select(fighter.id)}
                                            >
                                                <div className={styles.dropdownFighterInfo}>
                                                    <S3Image
                                                        src={fighter.profileImage}
                                                        alt={`${fighter.firstName} ${fighter.lastName}`}
                                                        className={styles.dropdownFighterImage}
                                                        width={40}
                                                        height={40}
                                                        lazy={false}
                                                        disableHoverScale={true}
                                                        fallback={
                                                            <div className={styles.dropdownImagePlaceholder}>
                                                                <FontAwesomeIcon icon={faUser} />
                                                            </div>
                                                        }
                                                    />
                                                    <span className={styles.dropdownFighterName}>
                                                        {fighter.firstName} {fighter.lastName}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                <>
                    <div className={styles.fightersComparison}>
                        <div className={styles.fighterSection}>
                            <div className={styles.fighterImageContainer}>
                                <S3Image
                                    src={fighter1.profileImage}
                                    alt={`${fighter1.firstName} ${fighter1.lastName}`}
                                    className={styles.versusFighterImage}
                                    width={357}
                                    height={459}
                                    lazy={false}
                                    disableHoverScale={true}
                                    fallback={
                                        <div className={styles.versusImagePlaceholder}>
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
                                    className={styles.versusFighterImage}
                                    width={357}
                                    height={459}
                                    lazy={false}
                                    disableHoverScale={true}
                                    fallback={
                                        <div className={styles.versusImagePlaceholder}>
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

                    {/* Head-to-Head Section */}
                    <HeadToHead 
                        fighter1={fighter1}
                        fighter2={fighter2}
                        headToHeadData={headToHeadData}
                    />

                    {/* Stats Comparison Section */}
                    <StatsComparison 
                        fighter1={fighter1}
                        fighter2={fighter2}
                    />
                </>
            )}
        </div>
    );
};

export default VersusPage;

