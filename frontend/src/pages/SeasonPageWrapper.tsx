import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { GET_SEASON_DETAILS } from '../services/queries';
import LeagueSeasonPage from './LeagueSeasonPage/LeagueSeasonPage';
import CupSeasonPage from './CupSeasonPage/CupSeasonPage';

const SeasonPageWrapper: React.FC = () => {
    const { seasonId } = useParams<{ seasonId: string }>();

    const { loading, error, data } = useQuery(GET_SEASON_DETAILS, {
        variables: { id: seasonId },
        skip: !seasonId
    });

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                fontSize: '1.1rem',
                color: 'var(--text-secondary)'
            }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '1rem', fontSize: '1.5rem', color: '#4285f4' }} />
                Loading season...
            </div>
        );
    }

    if (error || !data?.getCompetitionSeason) {
        console.error('Season loading error:', error);
        console.log('Season data:', data);
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                fontSize: '1.1rem',
                color: '#ea4335',
                gap: '1rem'
            }}>
                <div>Error loading season</div>
                {error && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '600px', textAlign: 'center' }}>
                        {error.message}
                    </div>
                )}
            </div>
        );
    }

    // Determine if it's a league or cup season
    const season = data.getCompetitionSeason;
    const isCupSeason = season.cupData !== null && season.cupData !== undefined;

    // Render the appropriate component
    if (isCupSeason) {
        return <CupSeasonPage />;
    } else {
        return <LeagueSeasonPage />;
    }
};

export default SeasonPageWrapper;

