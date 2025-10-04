import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import { getCountryFlag } from '../../utils/countryFlags';
import './FighterPage.css';

interface Location {
    city?: string;
    country?: string;
}

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

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    profileImage?: string;
    skillset?: string[];
    location?: Location;
    physicalAttributes?: PhysicalAttributes;
}

const FighterPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { loading, error, data } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id },
        skip: !id
    });

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

            {fighter.physicalAttributes && (
                <div className="physical-attributes-section">
                    <div className="physical-attributes-content">
                        <h2 className="physical-attributes-title">Physical Attributes</h2>
                        <div className="physical-attributes-grid">
                            {fighter.physicalAttributes.heightFeet && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Height</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.heightFeet}
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.weightKg && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Weight</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.weightKg} kg
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.bodyType && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Body Type</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.bodyType}
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.armReach && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Arm Reach</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.armReach} cm
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.legReach && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Leg Reach</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.legReach} cm
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.koPower && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">KO Power</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.koPower}/10
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.durability && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Durability</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.durability}/10
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.strength && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Strength</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.strength}/10
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.endurance && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Endurance</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.endurance}/10
                                    </span>
                                </div>
                            )}
                            {fighter.physicalAttributes.agility && (
                                <div className="physical-attribute-item">
                                    <span className="physical-attribute-label">Agility</span>
                                    <span className="physical-attribute-value">
                                        {fighter.physicalAttributes.agility}/10
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FighterPage;
