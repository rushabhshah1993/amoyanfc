import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faSearch, faMapMarkerAlt, faSort, faTrophy } from '@fortawesome/free-solid-svg-icons';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [groupByLocation, setGroupByLocation] = useState(false);

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

    // Filter fighters based on search query
    const filteredFighters = fighters.filter((fighter) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const firstName = fighter.firstName.toLowerCase();
        const lastName = fighter.lastName.toLowerCase();
        return firstName.includes(query) || lastName.includes(query);
    });

    // Sort fighters alphabetically by first name (create new array to avoid mutating read-only array)
    const sortedFighters = [...filteredFighters].sort((a, b) => 
        a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase())
    );

    // Group fighters by country if groupByLocation is enabled
    const groupedByCountry = groupByLocation ? sortedFighters.reduce((acc, fighter) => {
        const country = fighter.location?.country || 'Unknown';
        if (!acc[country]) {
            acc[country] = [];
        }
        acc[country].push(fighter);
        return acc;
    }, {} as Record<string, Fighter[]>) : null;

    // Sort countries alphabetically
    const sortedCountries = groupedByCountry 
        ? Object.keys(groupedByCountry).sort((a, b) => a.localeCompare(b))
        : [];

    return (
        <div className={styles.fightersPage}>
            <div className={styles.fightersSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Fighters</h2>
                </div>
                <div className={styles.controlsRow}>
                    <button 
                        className={styles.compareButton}
                        onClick={() => navigate('/versus?compare=true')}
                    >
                        Compare Fighters
                    </button>
                    <div className={styles.rightControls}>
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="Search fighters..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                        </div>
                        <button 
                            className={styles.globalRankingsButton}
                            onClick={() => navigate('/global-rankings')}
                            title="View Global Rankings"
                        >
                            <FontAwesomeIcon icon={faTrophy} />
                        </button>
                        <button 
                            className={styles.locationButton}
                            onClick={() => navigate('/fighters/sort')}
                            title="Sort fighters"
                        >
                            <FontAwesomeIcon icon={faSort} />
                        </button>
                        <button 
                            className={`${styles.locationButton} ${groupByLocation ? styles.active : ''}`}
                            onClick={() => setGroupByLocation(!groupByLocation)}
                            title="Group by location"
                        >
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                        </button>
                    </div>
                </div>
                
                {sortedFighters.length === 0 ? (
                    <div className={styles.noFighters}>
                        <FontAwesomeIcon icon={faUser} className={styles.noFightersIcon} />
                        No fighters found.
                    </div>
                ) : groupByLocation ? (
                    // Grouped by country view
                    <div className={styles.groupedFighters}>
                        {sortedCountries.map((country) => (
                            <div key={country} className={styles.countryGroup}>
                                <h3 className={styles.countryHeader}>
                                    <span className={styles.countryFlag}>{getCountryFlag(country)}</span>
                                    {country}
                                </h3>
                                <div className={styles.fightersGrid}>
                                    {groupedByCountry![country].map((fighter) => (
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
                                                    height={310}
                                                    lazy={true}
                                                    retryCount={3}
                                                    retryDelay={1000}
                                                    disableHoverScale={true}
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Regular grid view
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
                                        height={310}
                                        lazy={true}
                                        retryCount={3}
                                        retryDelay={1000}
                                        disableHoverScale={true}
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FightersPage;
