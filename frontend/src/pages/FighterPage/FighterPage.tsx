import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
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
                    <h1 className="fighter-name">
                        {fighter.firstName} {fighter.lastName}
                    </h1>

                    <div className="fighter-details">
                        {fighter.location && (
                            <div className="detail-item">
                                <span className="detail-label">Location:</span>
                                <span className="detail-value">
                                    {fighter.location.city && fighter.location.country 
                                        ? `${fighter.location.city}, ${fighter.location.country}`
                                        : fighter.location.city || fighter.location.country || 'N/A'
                                    }
                                </span>
                            </div>
                        )}

                        {fighter.skillset && fighter.skillset.length > 0 && (
                            <div className="detail-item">
                                <span className="detail-label">Fighting Style:</span>
                                <span className="detail-value">
                                    {fighter.skillset.join(', ')}
                                </span>
                            </div>
                        )}

                        {fighter.dateOfBirth ? (
                            <div className="detail-item">
                                <span className="detail-label">Birthday:</span>
                                <span className="detail-value">
                                    {formatDate(fighter.dateOfBirth)} ({calculateAge(fighter.dateOfBirth)} years old)
                                </span>
                            </div>
                        ) : (
                            <div className="detail-item">
                                <span className="detail-label">Birthday:</span>
                                <span className="detail-value">Not available</span>
                            </div>
                        )}

                        {fighter.physicalAttributes && (
                            <div className="physical-attributes">
                                <h3 className="attributes-title">Physical Attributes</h3>
                                <div className="attributes-grid">
                                    {fighter.physicalAttributes.heightFeet && (
                                        <div className="attribute-item">
                                            <span className="attribute-label">Height:</span>
                                            <span className="attribute-value">
                                                {fighter.physicalAttributes.heightFeet}
                                            </span>
                                        </div>
                                    )}
                                    {fighter.physicalAttributes.weightKg && (
                                        <div className="attribute-item">
                                            <span className="attribute-label">Weight:</span>
                                            <span className="attribute-value">
                                                {fighter.physicalAttributes.weightKg} kg
                                            </span>
                                        </div>
                                    )}
                                    {fighter.physicalAttributes.bodyType && (
                                        <div className="attribute-item">
                                            <span className="attribute-label">Body Type:</span>
                                            <span className="attribute-value">
                                                {fighter.physicalAttributes.bodyType}
                                            </span>
                                        </div>
                                    )}
                                    {fighter.physicalAttributes.armReach && (
                                        <div className="attribute-item">
                                            <span className="attribute-label">Arm Reach:</span>
                                            <span className="attribute-value">
                                                {fighter.physicalAttributes.armReach} cm
                                            </span>
                                        </div>
                                    )}
                                    {fighter.physicalAttributes.legReach && (
                                        <div className="attribute-item">
                                            <span className="attribute-label">Leg Reach:</span>
                                            <span className="attribute-value">
                                                {fighter.physicalAttributes.legReach} cm
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FighterPage;
