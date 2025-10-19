import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { 
  GET_SEASON_DETAILS,
  GET_ALL_FIGHTERS 
} from '../../services/queries';
import styles from './RoundsPage.module.css';

interface Fighter {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface Fight {
  _id: string;
  fighter1: string;
  fighter2: string;
  winner?: string;
  fightIdentifier: string;
}

interface Round {
  roundNumber: number;
  fights: Fight[];
}

interface Division {
  divisionNumber: number;
  divisionName: string;
  currentRound: number;
  totalRounds: number;
  rounds: Round[];
}

interface RoundResult {
  opponentId: string;
  isWin: boolean;
  fightId: string;
}

const RoundsPage: React.FC = () => {
  const { competitionId, seasonId, divisionNumber } = useParams<{
    competitionId: string;
    seasonId: string;
    divisionNumber: string;
  }>();
  const navigate = useNavigate();

  const [divisionData, setDivisionData] = useState<Division | null>(null);
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [fightersInDivision, setFightersInDivision] = useState<Fighter[]>([]);
  const [roundsMatrix, setRoundsMatrix] = useState<Map<string, Map<number, RoundResult>>>(new Map());

  // Get season data
  const { data: seasonData, loading: seasonLoading } = useQuery(GET_SEASON_DETAILS, {
    variables: { id: seasonId },
    skip: !seasonId,
  });

  // Get fighters data
  const { data: fightersData } = useQuery(GET_ALL_FIGHTERS);
  
  const getFighterById = (fighterId: string): Fighter | undefined => {
    return fightersData?.getAllFighters?.find((f: Fighter) => f.id === fighterId);
  };

  // Process division data and build the matrix
  useEffect(() => {
    if (seasonData?.getCompetitionSeason && fightersData?.getAllFighters) {
      const season = seasonData.getCompetitionSeason;
      
      // Set season number
      if (season.seasonMeta?.seasonNumber) {
        setSeasonNumber(season.seasonMeta.seasonNumber);
      }
      
      // Find division data
      if (season.leagueData?.divisions && season.seasonMeta?.leagueDivisions) {
        const division = season.leagueData.divisions.find(
          (d: Division) => d.divisionNumber === parseInt(divisionNumber || '1')
        );
        
        // Find fighters in this specific division from seasonMeta
        const divisionMeta = season.seasonMeta.leagueDivisions.find(
          (d: any) => d.divisionNumber === parseInt(divisionNumber || '1')
        );
        
        if (division && divisionMeta) {
          setDivisionData(division);
          
          // Build rounds matrix
          const matrix = new Map<string, Map<number, RoundResult>>();
          
          // Iterate through all rounds and fights
          division.rounds?.forEach((round: Round) => {
            round.fights?.forEach((fight: Fight) => {
              // Build matrix for fighter1
              if (!matrix.has(fight.fighter1)) {
                matrix.set(fight.fighter1, new Map());
              }
              matrix.get(fight.fighter1)!.set(round.roundNumber, {
                opponentId: fight.fighter2,
                isWin: fight.winner === fight.fighter1,
                fightId: fight._id
              });
              
              // Build matrix for fighter2
              if (!matrix.has(fight.fighter2)) {
                matrix.set(fight.fighter2, new Map());
              }
              matrix.get(fight.fighter2)!.set(round.roundNumber, {
                opponentId: fight.fighter1,
                isWin: fight.winner === fight.fighter2,
                fightId: fight._id
              });
            });
          });
          
          // Get fighters from seasonMeta (this gives us the exact division fighters)
          const fighters = divisionMeta.fighters
            .map((f: any) => getFighterById(f.id))
            .filter((f: Fighter | undefined): f is Fighter => f !== undefined)
            .sort((a: Fighter, b: Fighter) => {
              const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
              const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
              return nameA.localeCompare(nameB);
            });
          
          setFightersInDivision(fighters);
          setRoundsMatrix(matrix);
          
          // Update page title
          document.title = `Amoyan FC | ${division.divisionName || `Division ${divisionNumber}`} Rounds - Season ${season.seasonMeta.seasonNumber}`;
        }
      }
    }
  }, [seasonData, fightersData, divisionNumber]);

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  const handleCellClick = (fightId: string) => {
    if (fightId) {
      navigate(`/fight/${fightId}`);
    }
  };

  const renderRoundsGrid = () => {
    if (!divisionData || fightersInDivision.length === 0) {
      return <div className={styles.noData}>No data available</div>;
    }

    // Determine number of rounds based on division number
    const divNum = parseInt(divisionNumber || '1');
    let numberOfRounds = 9; // Default for Division 1
    if (divNum === 2) {
      numberOfRounds = 11;
    } else if (divNum === 3) {
      numberOfRounds = 15;
    }

    const rounds = Array.from({ length: numberOfRounds }, (_, i) => i + 1);

    return (
      <div className={styles.gridContainer}>
        <div className={styles.gridWrapper}>
          {/* Header Row */}
          <div className={styles.gridHeader}>
            <div className={styles.headerFighter}>Fighter</div>
            <div className={`${styles.roundsGrid} ${styles[`rounds${numberOfRounds}`]}`}>
              {rounds.map(roundNum => (
                <div key={roundNum} className={styles.headerRound}>
                  R{roundNum}
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows */}
          <div className={styles.gridBody}>
            {fightersInDivision.map(fighter => {
              const fighterRounds = roundsMatrix.get(fighter.id);
              
              return (
                <div key={fighter.id} className={styles.gridRow}>
                  {/* Fighter Name Column */}
                  <div className={styles.fighterCell}>
                    <div className={styles.fighterInfo}>
                      {fighter.profileImage && (
                        <img
                          src={fighter.profileImage}
                          alt={`${fighter.firstName} ${fighter.lastName}`}
                          className={styles.fighterAvatar}
                        />
                      )}
                      <span className={styles.fighterName}>
                        {fighter.firstName} {fighter.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Round Cells */}
                  <div className={`${styles.roundsGrid} ${styles[`rounds${numberOfRounds}`]}`}>
                    {rounds.map(roundNum => {
                      const roundResult = fighterRounds?.get(roundNum);
                      
                      if (!roundResult) {
                        return (
                          <div key={roundNum} className={styles.resultCell}>
                            <div className={styles.emptyCell}></div>
                          </div>
                        );
                      }

                      const opponent = getFighterById(roundResult.opponentId);
                      
                      return (
                        <div 
                          key={roundNum} 
                          className={styles.resultCell}
                          onClick={() => handleCellClick(roundResult.fightId)}
                        >
                          <div 
                            className={`${styles.opponentCell} ${roundResult.isWin ? styles.win : styles.loss}`}
                            title={opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Unknown'}
                          >
                            {opponent?.profileImage && (
                              <img
                                src={opponent.profileImage}
                                alt={`${opponent.firstName} ${opponent.lastName}`}
                                className={styles.opponentImage}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (seasonLoading) {
    return <div className={styles.loadingPage}>Loading...</div>;
  }

  return (
    <div className={styles.roundsPage}>
      <div className={styles.pageContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1>SEASON {seasonNumber} - {divisionData?.divisionName || `DIVISION ${divisionNumber}`} - ALL ROUNDS</h1>
          <button 
            className={styles.backButton}
            onClick={() => navigate(`/competition/${competitionId}/season/${seasonId}/division/${divisionNumber}`)}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
            Back to Division
          </button>
        </div>

        {/* Rounds Grid */}
        {renderRoundsGrid()}
      </div>
    </div>
  );
};

export default RoundsPage;

