import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { GET_ALL_FIGHTERS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import { getCountryFlag } from '../../utils/countryFlags';
import styles from './FightersPage.module.css';

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
        <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
            Loading fighters...
        </div>
    );
    
    if (error) return <div className={styles.error}>Error: {error.message}</div>;

    const fighters: Fighter[] = data?.getAllFighters || [];

    // Sort fighters alphabetically by first name (create new array to avoid mutating read-only array)
    const sortedFighters = [...fighters].sort((a, b) => 
        a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase())
    );

    return (
        <div className={styles.fightersPage}>
            <div className={styles.fightersSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Fighters</h2>
                </div>
                
                {sortedFighters.length === 0 ? (
                    <div className={styles.noFighters}>
                        <FontAwesomeIcon icon={faUser} className={styles.noFightersIcon} />
                        No fighters found.
                    </div>
                ) : (
                    <div className={styles.fightersGrid}>
                        {sortedFighters.map((fighter) => (
                            <div 
                                key={fighter.id} 
                                className={styles.fighterCard}
                                onClick={() => navigate(`/fighter/${fighter.id}`)}
                            >
                                <div className={styles.fighterImageContainer}>
                                    <S3Image
                                        src={fighter.profileImage}
                                        alt={`${fighter.firstName} ${fighter.lastName}`}
                                        className={styles.fighterImage}
                                        width={280}
                                        height={280}
                                        lazy={true}
                                        retryCount={3}
                                        retryDelay={1000}
                                        fallback={
                                            <div className={styles.fighterPlaceholder}>
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        }
                                        loading={
                                            <div className={styles.fighterLoading}>
                                                <FontAwesomeIcon icon={faSpinner} spin />
                                            </div>
                                        }
                                    />
                                </div>
                                <div className={styles.fighterInfo}>
                                    <div className={styles.fighterName}>
                                        <span className={styles.fighterFirstName}>{fighter.firstName}</span>
                                        <span className={styles.fighterLastName}>{fighter.lastName}</span>
                                    </div>
                                    {fighter.location && (fighter.location.city || fighter.location.country) && (
                                        <div className={styles.fighterLocation}>
                                            {fighter.location.country && (
                                                <span className={styles.countryFlag}>
                                                    {getCountryFlag(fighter.location.country)}
                                                </span>
                                            )}
                                            <span className={styles.locationText}>
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
