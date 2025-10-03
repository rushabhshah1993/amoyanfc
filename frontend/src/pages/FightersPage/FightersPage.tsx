import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
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

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    physicalAttributes?: PhysicalAttributes;
}

const FightersPage: React.FC = () => {
    const { loading, error, data } = useQuery(GET_ALL_FIGHTERS);

    if (loading) return (
        <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
            Loading fighters...
        </div>
    );
    
    if (error) return <div className="error">Error: {error.message}</div>;

    const fighters: Fighter[] = data?.getAllFighters || [];

    return (
        <div className="fighters-page">
            <div className="fighters-section">
                <div className="section-header">
                    <h2 className="section-title">Fighters</h2>
                    <p className="section-subtitle">Meet our talented fighters</p>
                </div>
                
                {fighters.length === 0 ? (
                    <div className="no-fighters">
                        <FontAwesomeIcon icon={faUser} className="no-fighters-icon" />
                        No fighters found.
                    </div>
                ) : (
                    <div className="fighters-grid">
                        {fighters.map((fighter) => (
                            <div key={fighter.id} className="fighter-card">
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
                                    <h3 className="fighter-name">
                                        {fighter.firstName} {fighter.lastName}
                                    </h3>
                                    {fighter.physicalAttributes && (
                                        <div className="fighter-stats">
                                            {fighter.physicalAttributes.heightFeet && (
                                                <span className="stat">
                                                    Height: {fighter.physicalAttributes.heightFeet}
                                                </span>
                                            )}
                                            {fighter.physicalAttributes.weightKg && (
                                                <span className="stat">
                                                    Weight: {fighter.physicalAttributes.weightKg}kg
                                                </span>
                                            )}
                                            {fighter.physicalAttributes.bodyType && (
                                                <span className="stat">
                                                    Body Type: {fighter.physicalAttributes.bodyType}
                                                </span>
                                            )}
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
