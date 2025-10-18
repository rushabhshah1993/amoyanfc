import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import { getCountryFlag } from '../../utils/countryFlags';
import './FightersPage.css';

interface PhysicalAttributes {
    heightCm?: number;
    heightFeet?: string;
    weightKg?: number;
    armReach?: number;
    legReach?: number;
    bodyType?: string;
    koPower?: number;
    durability?: number;
    strength?: number;
    endurance?: number;
    agility?: number;
}

interface Location {
    city?: string;
    country?: string;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    location?: Location;
    physicalAttributes?: PhysicalAttributes;
}


const FightersPage: React.FC = () => {
    const navigate = useNavigate();
    const { loading, error, data } = useQuery(GET_ALL_FIGHTERS);

    useEffect(() => {
        document.title = 'Amoyan FC | Fighters';
    }, []);

    if (loading) return (
        <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
            Loading fighters...
        </div>
    );
    
    if (error) return <div className="error">Error: {error.message}</div>;

    const fighters: Fighter[] = data?.getAllFighters || [];

    // Sort fighters alphabetically by first name (create new array to avoid mutating read-only array)
    const sortedFighters = [...fighters].sort((a, b) => 
        a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase())
    );

    return (
        <div className="fighters-page">
            <div className="fighters-section">
                <div className="section-header">
                    <h2 className="section-title">Fighters</h2>
                </div>
                
                {sortedFighters.length === 0 ? (
                    <div className="no-fighters">
                        <FontAwesomeIcon icon={faUser} className="no-fighters-icon" />
                        No fighters found.
                    </div>
                ) : (
                    <div className="fighters-grid">
                        {sortedFighters.map((fighter) => (
                            <div 
                                key={fighter.id} 
                                className="fighter-card"
                                onClick={() => navigate(`/fighter/${fighter.id}`)}
                            >
                                <div className="fighter-image-container">
                                    <S3Image
                                        src={fighter.profileImage}
                                        alt={`${fighter.firstName} ${fighter.lastName}`}
                                        className="fighter-image"
                                        width={280}
                                        height={280}
                                        lazy={true}
                                        retryCount={3}
                                        retryDelay={1000}
                                        fallback={
                                            <div className="fighter-placeholder">
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        }
                                        loading={
                                            <div className="fighter-loading">
                                                <FontAwesomeIcon icon={faSpinner} spin />
                                            </div>
                                        }
                                    />
                                </div>
                                <div className="fighter-info">
                                    <div className="fighter-name">
                                        <span className="fighter-first-name">{fighter.firstName}</span>
                                        <span className="fighter-last-name">{fighter.lastName}</span>
                                    </div>
                                    {fighter.location && (fighter.location.city || fighter.location.country) && (
                                        <div className="fighter-location">
                                            {fighter.location.country && (
                                                <span className="country-flag">
                                                    {getCountryFlag(fighter.location.country)}
                                                </span>
                                            )}
                                            <span className="location-text">
                                                {fighter.location.city && fighter.location.country 
                                                    ? `${fighter.location.city}, ${fighter.location.country}`
                                                    : fighter.location.city || fighter.location.country
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FightersPage;
