import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { 
  GET_ROUND_STANDINGS_BY_ROUND, 
  GET_SEASON_DETAILS,
  GET_ALL_FIGHTERS 
} from '../../services/queries';
import Dropdown, { DropdownOption } from '../../components/Dropdown';
import styles from './DivisionPage.module.css';

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
  const navigate = useNavigate();

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

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [divisionNumber]);

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
          
          // Update page title
          document.title = `Amoyan FC | ${division.divisionName || `Division ${divisionNumber}`} - Season ${season.seasonMeta.seasonNumber}`;
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
      return <div className={styles.loading}>Loading standings...</div>;
    }

    if (!standingsData?.getRoundStandingsByRound?.standings) {
      return <div className={styles.noData}>No standings available</div>;
    }

    const standings = standingsData.getRoundStandingsByRound.standings;
    
    // Check if it's the final round
    const isFinalRound = divisionData && selectedRound === divisionData.totalRounds;
    
    // Check division number
    const divNum = parseInt(divisionNumber || '1');
    
    // Helper function to get row class based on rank in final round
    const getRowClass = (rank: number) => {
      if (!isFinalRound) {
        return rank === 1 ? styles.champion : '';
      }
      
      // Final round logic based on division
      if (divNum === 1) {
        // Division 1: Only relegation (bottom 3), no promotion
        if (rank >= standings.length - 2) {
          return styles.relegated; // Bottom 3 relegated
        }
        return rank === 1 ? styles.champion : '';
      } else if (divNum === 2 || divNum === 3) {
        // Division 2 or 3: Both promotion (top 3) and relegation (bottom 3)
        if (rank <= 3) {
          return styles.promoted; // Top 3 promoted
        } else if (rank >= standings.length - 2) {
          return styles.relegated; // Bottom 3 relegated
        }
        return rank === 1 ? styles.champion : '';
      }
      
      return rank === 1 ? styles.champion : '';
    };

    return (
      <div className={styles.standingsTableContainer}>
        <h2>Standings after Round {selectedRound}</h2>
        <table className={styles.standingsTable}>
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
                <tr key={standing.fighterId} className={getRowClass(standing.rank)}>
                  <td className={styles.rank}>{standing.rank}</td>
                  <td className={styles.fighterCell}>
                    <div className={styles.fighterInfo}>
                      {fighter?.profileImage && (
                        <img
                          src={fighter.profileImage}
                          alt={`${fighter.firstName} ${fighter.lastName}`}
                          className={styles.fighterAvatar}
                        />
                      )}
                      <span className={styles.fighterName}>
                        {fighter ? `${fighter.firstName} ${fighter.lastName}` : 'Unknown Fighter'}
                        {isFinalRound && standing.rank === 1 && (
                          <FontAwesomeIcon icon={faTrophy} className={styles.trophyIcon} />
                        )}
                      </span>
                    </div>
                  </td>
                  <td>{standing.fightsCount}</td>
                  <td>{standing.wins}</td>
                  <td className={styles.points}>{standing.points}</td>
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
      return <div className={styles.loading}>Loading fights...</div>;
    }

    const currentRound = divisionData.rounds?.find(r => r.roundNumber === selectedRound);
    
    if (!currentRound || !currentRound.fights) {
      return <div className={styles.noData}>No fights available for this round</div>;
    }

    return (
      <div className={styles.fightsListContainer}>
        <div className={styles.fightsList}>
          {currentRound.fights.map((fight: Fight, index: number) => {
            const fighter1 = getFighterById(fight.fighter1);
            const fighter2 = getFighterById(fight.fighter2);

            return (
              <div key={fight.fightIdentifier || index} className={styles.fightCard}>
                <div className={styles.fightNumber}>Fight {index + 1}</div>
                
                <div className={styles.fightersContainer}>
                  {/* Fighter 1 */}
                  <div className={`${styles.fighterSide} ${fight.winner === fight.fighter1 ? styles.winner : ''}`}>
                    {fight.winner === fight.fighter1 && (
                      <div className={styles.winnerTag}>WINNER</div>
                    )}
                    {fighter1?.profileImage && (
                      <img
                        src={fighter1.profileImage}
                        alt={`${fighter1.firstName} ${fighter1.lastName}`}
                        className={styles.fighterImage}
                      />
                    )}
                    <div className={styles.fighterNameSmall}>
                      {fighter1 ? `${fighter1.firstName} ${fighter1.lastName}` : 'TBD'}
                    </div>
                  </div>

                  {/* VS */}
                  <div className={styles.vsIndicator}>VS</div>

                  {/* Fighter 2 */}
                  <div className={`${styles.fighterSide} ${fight.winner === fight.fighter2 ? styles.winner : ''}`}>
                    {fight.winner === fight.fighter2 && (
                      <div className={styles.winnerTag}>WINNER</div>
                    )}
                    {fighter2?.profileImage && (
                      <img
                        src={fighter2.profileImage}
                        alt={`${fighter2.firstName} ${fighter2.lastName}`}
                        className={styles.fighterImage}
                      />
                    )}
                    <div className={styles.fighterNameSmall}>
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
    
    const roundOptions: DropdownOption[] = rounds.map(round => ({
      value: round,
      label: `Round ${round}`
    }));

    return (
      <div className={styles.roundSelector}>
        <Dropdown
          options={roundOptions}
          value={selectedRound}
          onChange={(value) => setSelectedRound(value as number)}
          align="right"
          maxHeight={240}
        />
      </div>
    );
  };

  if (seasonLoading) {
    return <div className={styles.loadingPage}>Loading...</div>;
  }

  return (
    <div className={styles.divisionPage}>
      <div className={styles.divisionContent}>
        <div className={styles.divisionHeader}>
          <h1>SEASON {seasonNumber} - {divisionData?.divisionName || `DIVISION ${divisionNumber}`}</h1>
          <button 
            className={styles.backButton}
            onClick={() => navigate(`/competition/${competitionId}/season/${seasonId}`)}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
            Back to Season
          </button>
        </div>

        <div className={styles.contentGrid}>
          {/* Left Side - Standings Table */}
          <div className={styles.leftPanel}>
            {renderStandingsTable()}
          </div>

          {/* Right Side - Round Selector and Fights */}
          <div className={styles.rightPanel}>
            {renderRoundSelector()}
            {renderFightsList()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DivisionPage;

