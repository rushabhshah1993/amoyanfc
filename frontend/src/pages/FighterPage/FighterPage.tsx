import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser, faCircleLeft, faCircleDown } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION, GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import PhysicalAttributes from '../../components/PhysicalAttributes/PhysicalAttributes';
import OpponentsGrid from '../../components/OpponentsGrid/OpponentsGrid';
import CompetitionHistory from '../../components/CompetitionHistory/CompetitionHistory';
import Streaks from '../../components/Streaks/Streaks';
import Performance from '../../components/Performance/Performance';
import { getCountryFlag } from '../../utils/countryFlags';
import './FighterPage.css';

interface Location {
    city?: string;
    country?: string;
}

interface DebutInformation {
    competitionId: string;
    season: number;
    fightId: string;
    dateOfDebut?: string;
    competitionMeta?: {
        id: string;
        competitionName: string;
        logo?: string;
    };
}

interface StreakStart {
    season: number;
    division: number;
    round: number;
}

interface StreakEnd {
    season: number;
    division: number;
    round: number;
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    logo?: string;
}

interface Opponent {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Streak {
    competitionId: string;
    type: 'win' | 'lose';
    start: StreakStart;
    end?: StreakEnd;
    count: number;
    active: boolean;
    opponents: Opponent[];
    competitionMeta: CompetitionMeta;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    profileImage?: string;
    skillset?: string[];
    location?: Location;
    debutInformation?: DebutInformation;
    physicalAttributes?: any;
    opponentsHistory?: any[];
    competitionHistory?: any[];
    streaks?: Streak[];
}

const FighterPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { loading, error, data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id },
        skip: !id
    });

    // Fetch all fighters for the opponents grid
    const { loading: loadingAllFighters, data: allFightersData } = useQuery(GET_ALL_FIGHTERS);
    
    // Scroll to top when component loads
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [id]);

    // Dynamically calculate and set the fighter content height based on header
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

    // Update page title when fighter data is loaded
    useEffect(() => {
        if (data?.getFighterInformation) {
            const fighter = data.getFighterInformation;
            document.title = `Amoyan FC | ${fighter.firstName}`;
        }
    }, [data]);

    const calculateAge = (dateOfBirth: string): number => {
        if (!dateOfBirth) return 0;
        
        const birthDate = new Date(dateOfBirth);
        if (isNaN(birthDate.getTime())) {
            console.error('Invalid date format:', dateOfBirth);
            return 0;
        }
        
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.error('Invalid date format:', dateString);
            return 'N/A';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="fighter-page">
                <div className="loading">
                    <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
                    Loading fighter information...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fighter-page">
                <div className="error">
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getFighterInformation) {
        return (
            <div className="fighter-page">
                <div className="error">
                    Fighter not found
                </div>
            </div>
        );
    }

    const fighter: Fighter = data.getFighterInformation;
    const allFighters: Fighter[] = allFightersData?.getAllFighters || [];

    const scrollToPhysicalAttributes = () => {
        const element = document.querySelector('.physical-attributes-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="fighter-page">
            <div className="fighter-content">
                <div className="fighter-image-section">
                    <S3Image
                        src={fighter.profileImage}
                        alt={`${fighter.firstName} ${fighter.lastName}`}
                        className="fighter-main-image"
                        width={400}
                        height={600}
                        lazy={false}
                        retryCount={3}
                        retryDelay={1000}
                        fallback={
                            <div className="fighter-image-placeholder">
                                <FontAwesomeIcon icon={faUser} />
                            </div>
                        }
                        loading={
                            <div className="fighter-image-loading">
                                <FontAwesomeIcon icon={faSpinner} spin />
                            </div>
                        }
                    />
                </div>

                <div className="fighter-info-section">
                    <div className="fighter-name-section">
                        <h1 className="fighter-first-name">{fighter.firstName}</h1>
                        <h2 className="fighter-last-name">{fighter.lastName}</h2>
                    </div>

                    <div className="fighter-details">
                        {fighter.location && (
                            <div className="detail-item">
                                <span className="detail-label">Location</span>
                                <span className="detail-value">
                                    {fighter.location.city && fighter.location.country 
                                        ? `${fighter.location.city}, ${getCountryFlag(fighter.location.country)} ${fighter.location.country}`
                                        : fighter.location.city || (fighter.location.country ? `${getCountryFlag(fighter.location.country)} ${fighter.location.country}` : 'N/A')
                                    }
                                </span>
                            </div>
                        )}

                        {fighter.skillset && fighter.skillset.length > 0 && (
                            <div className="detail-item">
                                <span className="detail-label">Fighting Style</span>
                                <span className="detail-value">
                                    {fighter.skillset.join(', ')}
                                </span>
                            </div>
                        )}

                        {fighter.dateOfBirth ? (
                            <div className="detail-item">
                                <span className="detail-label">Birthday</span>
                                <span className="detail-value">
                                    {formatDate(fighter.dateOfBirth)} ({calculateAge(fighter.dateOfBirth)} years old)
                                </span>
                            </div>
                        ) : (
                            <div className="detail-item">
                                <span className="detail-label">Birthday</span>
                                <span className="detail-value">Not available</span>
                            </div>
                        )}

                        {fighter.debutInformation && (
                            <div className="detail-item">
                                <span className="detail-label">Debut</span>
                                <span className="detail-value">
                                    {fighter.debutInformation.competitionMeta?.competitionName || 'Competition'} | Season {fighter.debutInformation.season}
                                    {fighter.debutInformation.dateOfDebut && (
                                        <span className="debut-date"> • {formatDate(fighter.debutInformation.dateOfDebut)}</span>
                                    )}
                                </span>
                            </div>
                        )}

                    </div>

                    <div className="fighter-actions">
                        <button 
                            className="action-button action-button-primary"
                            onClick={() => navigate('/fighters')}
                        >
                            <FontAwesomeIcon icon={faCircleLeft} />
                            All Fighters
                        </button>
                        <button 
                            className="action-button action-button-secondary"
                            onClick={scrollToPhysicalAttributes}
                        >
                            <FontAwesomeIcon icon={faCircleDown} />
                            More Statistics
                        </button>
                    </div>
                </div>
            </div>

            <PhysicalAttributes attributes={fighter.physicalAttributes} />

            <div className="fighter-performance-section">
                <Performance 
                    fighter={fighter}
                    allFighters={allFighters}
                    count={6}
                    showOpponentName={true}
                    sortOrder="asc"
                    size="lg"
                />
            </div>

            <CompetitionHistory competitionHistory={fighter.competitionHistory || []} />

            <OpponentsGrid
                currentFighterId={fighter.id}
                allFighters={allFighters}
                opponentsHistory={fighter.opponentsHistory || []}
                loading={loadingAllFighters}
            />

            <Streaks streaks={fighter.streaks || []} />
        </div>
    );
};

export default FighterPage;
