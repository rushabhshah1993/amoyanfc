import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { 
  GET_ROUND_STANDINGS_BY_ROUND, 
  GET_SEASON_DETAILS,
  GET_ALL_FIGHTERS 
} from '../../services/queries';
import './DivisionPage.css';

interface FighterStanding {
  fighterId: string;
  fightsCount: number;
  wins: number;
  points: number;
  rank: number;
  totalFightersCount: number;
}

interface RoundStandings {
  id: string;
  standings: FighterStanding[];
  roundNumber: number;
}

interface Fight {
  fighter1: string;
  fighter2: string;
  winner?: string;
  fightIdentifier: string;
}

interface Division {
  divisionNumber: number;
  divisionName: string;
  currentRound: number;
  totalRounds: number;
  rounds: Array<{
    roundNumber: number;
    fights: Fight[];
  }>;
}

const DivisionPage: React.FC = () => {
  const { competitionId, seasonId, divisionNumber } = useParams<{
    competitionId: string;
    seasonId: string;
    divisionNumber: string;
  }>();

  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [divisionData, setDivisionData] = useState<Division | null>(null);
  const [seasonNumber, setSeasonNumber] = useState<number>(1);

  // Get season data to access division info and fights
  const { data: seasonData, loading: seasonLoading } = useQuery(GET_SEASON_DETAILS, {
    variables: { id: seasonId },
    skip: !seasonId,
  });

  // Get standings for the selected round
  const { data: standingsData, loading: standingsLoading } = useQuery(GET_ROUND_STANDINGS_BY_ROUND, {
    variables: {
      competitionId,
      seasonNumber: seasonNumber,
      divisionNumber: parseInt(divisionNumber || '1'),
      roundNumber: selectedRound,
    },
    skip: !competitionId || !selectedRound || !seasonNumber,
  });

  // Set initial division data and default to latest round
  useEffect(() => {
    if (seasonData?.getCompetitionSeason) {
      const season = seasonData.getCompetitionSeason;
      
      // Set season number from fetched data
      if (season.seasonMeta?.seasonNumber) {
        setSeasonNumber(season.seasonMeta.seasonNumber);
      }
      
      // Find and set division data
      if (season.leagueData?.divisions) {
        const division = season.leagueData.divisions.find(
          (d: Division) => d.divisionNumber === parseInt(divisionNumber || '1')
        );
        
        if (division) {
          setDivisionData(division);
          // Set selected round to current round by default
          setSelectedRound(division.currentRound || division.totalRounds);
        }
      }
    }
  }, [seasonData, divisionNumber]);

  // Get fighters data for displaying names and images
  const { data: fightersData } = useQuery(GET_ALL_FIGHTERS);
  
  const getFighterById = (fighterId: string) => {
    return fightersData?.getAllFighters?.find((f: any) => f.id === fighterId);
  };

  const renderStandingsTable = () => {
    if (standingsLoading) {
      return <div className="loading">Loading standings...</div>;
    }

    if (!standingsData?.getRoundStandingsByRound?.standings) {
      return <div className="no-data">No standings available</div>;
    }

    const standings = standingsData.getRoundStandingsByRound.standings;

    return (
      <div className="standings-table-container">
        <h2>Standings after Round {selectedRound}</h2>
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Fighter</th>
              <th>Fights</th>
              <th>Wins</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing: FighterStanding) => {
              const fighter = getFighterById(standing.fighterId);
              return (
                <tr key={standing.fighterId} className={standing.rank === 1 ? 'champion' : ''}>
                  <td className="rank">{standing.rank}</td>
                  <td className="fighter-cell">
                    <div className="fighter-info">
                      {fighter?.profileImage && (
                        <img
                          src={fighter.profileImage}
                          alt={`${fighter.firstName} ${fighter.lastName}`}
                          className="fighter-avatar"
                        />
                      )}
                      <span className="fighter-name">
                        {fighter ? `${fighter.firstName} ${fighter.lastName}` : 'Unknown Fighter'}
                      </span>
                    </div>
                  </td>
                  <td>{standing.fightsCount}</td>
                  <td>{standing.wins}</td>
                  <td className="points">{standing.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFightsList = () => {
    if (!divisionData) {
      return <div className="loading">Loading fights...</div>;
    }

    const currentRound = divisionData.rounds?.find(r => r.roundNumber === selectedRound);
    
    if (!currentRound || !currentRound.fights) {
      return <div className="no-data">No fights available for this round</div>;
    }

    return (
      <div className="fights-list-container">
        <h2>Round {selectedRound} Fights</h2>
        <div className="fights-list">
          {currentRound.fights.map((fight: Fight, index: number) => {
            const fighter1 = getFighterById(fight.fighter1);
            const fighter2 = getFighterById(fight.fighter2);

            return (
              <div key={fight.fightIdentifier || index} className="fight-card">
                <div className="fight-number">Fight {index + 1}</div>
                
                <div className="fighters-container">
                  {/* Fighter 1 */}
                  <div className={`fighter-side ${fight.winner === fight.fighter1 ? 'winner' : ''}`}>
                    {fighter1?.profileImage && (
                      <img
                        src={fighter1.profileImage}
                        alt={`${fighter1.firstName} ${fighter1.lastName}`}
                        className="fighter-image"
                      />
                    )}
                    <div className="fighter-name-small">
                      {fighter1 ? `${fighter1.firstName} ${fighter1.lastName}` : 'TBD'}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="vs-indicator">VS</div>

                  {/* Fighter 2 */}
                  <div className={`fighter-side ${fight.winner === fight.fighter2 ? 'winner' : ''}`}>
                    {fighter2?.profileImage && (
                      <img
                        src={fighter2.profileImage}
                        alt={`${fighter2.firstName} ${fighter2.lastName}`}
                        className="fighter-image"
                      />
                    )}
                    <div className="fighter-name-small">
                      {fighter2 ? `${fighter2.firstName} ${fighter2.lastName}` : 'TBD'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRoundSelector = () => {
    if (!divisionData) return null;

    const rounds = Array.from({ length: divisionData.totalRounds }, (_, i) => i + 1);

    return (
      <div className="round-selector">
        <label htmlFor="round-select">Select Round:</label>
        <select
          id="round-select"
          value={selectedRound}
          onChange={(e) => setSelectedRound(parseInt(e.target.value))}
          className="round-dropdown"
        >
          {rounds.map(round => (
            <option key={round} value={round}>
              Round {round}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (seasonLoading) {
    return <div className="division-page loading-page">Loading...</div>;
  }

  return (
    <div className="division-page">
      <div className="division-header">
        <h1>{divisionData?.divisionName || `Division ${divisionNumber}`}</h1>
        <p className="season-info">Season {seasonNumber}</p>
      </div>

      <div className="division-content">
        {/* Left Side - Standings Table */}
        <div className="left-panel">
          {renderStandingsTable()}
        </div>

        {/* Right Side - Round Selector and Fights */}
        <div className="right-panel">
          {renderRoundSelector()}
          {renderFightsList()}
        </div>
      </div>
    </div>
  );
};

export default DivisionPage;

