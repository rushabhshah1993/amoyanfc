import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION, GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import PhysicalAttributes from '../../components/PhysicalAttributes/PhysicalAttributes';
import OpponentsGrid from '../../components/OpponentsGrid/OpponentsGrid';
import CompetitionHistory from '../../components/CompetitionHistory/CompetitionHistory';
import { getCountryFlag } from '../../utils/countryFlags';
import './FighterPage.css';

interface Location {
    city?: string;
    country?: string;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    profileImage?: string;
    skillset?: string[];
    location?: Location;
    physicalAttributes?: any;
    opponentsHistory?: any[];
    competitionHistory?: any[];
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
            return 'Invalid Date';
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

    return (
        <div className="fighter-page">
            <div className="fighter-header">
                <button 
                    className="back-button"
                    onClick={() => navigate('/fighters')}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Fighters
                </button>
            </div>

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

                    </div>
                </div>
            </div>

            <PhysicalAttributes attributes={fighter.physicalAttributes} />

            <CompetitionHistory competitionHistory={fighter.competitionHistory || []} />

            <OpponentsGrid
                currentFighterId={fighter.id}
                allFighters={allFighters}
                opponentsHistory={fighter.opponentsHistory || []}
                loading={loadingAllFighters}
            />
        </div>
    );
};

export default FighterPage;
