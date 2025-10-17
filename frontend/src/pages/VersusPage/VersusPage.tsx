import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_FIGHTER_INFORMATION, GET_COMPETITION_META } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import HeadToHead from '../../components/HeadToHead/HeadToHead';
import StatsComparison from '../../components/StatsComparison/StatsComparison';
import './VersusPage.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    opponentsHistory?: OpponentHistory[];
}

interface OpponentHistory {
    opponentId: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    details: FightDetail[];
}

interface FightDetail {
    competitionId: string;
    season: number;
    division?: number;
    round: number;
    fightId: string;
    isWinner: boolean;
}

interface CompetitionHeadToHead {
    competitionId: string;
    competitionName: string;
    totalFights: number;
    fighter1Wins: number;
    fighter2Wins: number;
    fights: {
        winner: string; // fighter ID
        season: number;
        division?: number;
        round: number;
        fightId: string;
    }[];
}

const VersusPage: React.FC = () => {
    const { fighter1Id, fighter2Id } = useParams<{ fighter1Id: string; fighter2Id: string }>();
    const navigate = useNavigate();
    
    // Scroll to top when component loads
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [fighter1Id, fighter2Id]);
    
    const [competitionNames, setCompetitionNames] = useState<Record<string, string>>({});

    // Fetch both fighters
    const { loading: loading1, error: error1, data: data1 } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter1Id },
        skip: !fighter1Id
    });

    const { loading: loading2, error: error2, data: data2 } = useQuery(GET_FIGHTER_INFORMATION, {
        variables: { id: fighter2Id },
        skip: !fighter2Id
    });

    // Get fighters data
    const fighter1: Fighter | null = data1?.getFighterInformation || null;
    const fighter2: Fighter | null = data2?.getFighterInformation || null;

    // Get head-to-head data from fighter1's opponentsHistory
    const opponentRecord = fighter1?.opponentsHistory?.find(
        oh => oh.opponentId === fighter2Id
    );

    // Fetch competition names for all unique competition IDs
    useEffect(() => {
        const fetchCompetitionNames = async () => {
            if (!opponentRecord || !opponentRecord.details) return;

            const uniqueCompIds = Array.from(new Set(opponentRecord.details.map(d => d.competitionId)));
            const names: Record<string, string> = {};

            for (const compId of uniqueCompIds) {
                try {
                    const response = await fetch(process.env.REACT_APP_GRAPHQL_URI || 'http://localhost:4000/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `
                                query GetCompetitionMeta($id: ID!) {
                                    getCompetitionMeta(id: $id) {
                                        id
                                        competitionName
                                    }
                                }
                            `,
                            variables: { id: compId }
                        }),
                        credentials: 'include'
                    });

                    const result = await response.json();
                    if (result.data?.getCompetitionMeta) {
                        names[compId] = result.data.getCompetitionMeta.competitionName;
                    }
                } catch (error) {
                    console.error('Error fetching competition name:', error);
                    names[compId] = 'Unknown Competition';
                }
            }

            setCompetitionNames(names);
        };

        fetchCompetitionNames();
    }, [opponentRecord]);

    if (loading1 || loading2) {
        return (
            <div className="versus-page">
                <div className="loading">
                    <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
                    Loading fighters...
                </div>
            </div>
        );
    }

    if (error1 || error2) {
        return (
            <div className="versus-page">
                <div className="error">
                    Error: {error1?.message || error2?.message}
                </div>
            </div>
        );
    }

    if (!fighter1 || !fighter2) {
        return (
            <div className="versus-page">
                <div className="error">
                    Fighters not found
                </div>
            </div>
        );
    }

    // Group fights by competition
    const getHeadToHeadByCompetition = (): CompetitionHeadToHead[] => {
        if (!opponentRecord || !opponentRecord.details || opponentRecord.details.length === 0) {
            return [];
        }

        const competitionMap = new Map<string, CompetitionHeadToHead>();

        opponentRecord.details.forEach(detail => {
            const compId = detail.competitionId;

            if (!competitionMap.has(compId)) {
                competitionMap.set(compId, {
                    competitionId: compId,
                    competitionName: competitionNames[compId] || 'Loading...',
                    totalFights: 0,
                    fighter1Wins: 0,
                    fighter2Wins: 0,
                    fights: []
                });
            }

            const comp = competitionMap.get(compId)!;
            comp.totalFights++;

            if (detail.isWinner) {
                comp.fighter1Wins++;
            } else {
                comp.fighter2Wins++;
            }

            comp.fights.push({
                winner: detail.isWinner ? fighter1.id : fighter2.id,
                season: detail.season,
                division: detail.division,
                round: detail.round,
                fightId: detail.fightId
            });
        });

        return Array.from(competitionMap.values());
    };

    const headToHeadData = getHeadToHeadByCompetition();
    const hasNoFights = headToHeadData.length === 0;

    return (
        <div className="versus-page">
            <div className="versus-header">
                <button 
                    className="back-button"
                    onClick={() => navigate(-1)}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back
                </button>
            </div>

            {/* Fighter Comparison Section */}
            <div className="fighters-comparison">
                <div className="fighter-section">
                    <div className="fighter-image-container">
                        <S3Image
                            src={fighter1.profileImage}
                            alt={`${fighter1.firstName} ${fighter1.lastName}`}
                            className="versus-fighter-image"
                            width={350}
                            height={450}
                            lazy={false}
                            fallback={
                                <div className="versus-image-placeholder">
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                            }
                        />
                    </div>
                    <h2 className="fighter-name">
                        {fighter1.firstName} {fighter1.lastName}
                    </h2>
                </div>

                <div className="versus-divider">
                    <span className="versus-text">VS</span>
                </div>

                <div className="fighter-section">
                    <div className="fighter-image-container">
                        <S3Image
                            src={fighter2.profileImage}
                            alt={`${fighter2.firstName} ${fighter2.lastName}`}
                            className="versus-fighter-image"
                            width={350}
                            height={450}
                            lazy={false}
                            fallback={
                                <div className="versus-image-placeholder">
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                            }
                        />
                    </div>
                    <h2 className="fighter-name">
                        {fighter2.firstName} {fighter2.lastName}
                    </h2>
                </div>
            </div>

            {/* Head-to-Head Section */}
            <HeadToHead 
                fighter1={fighter1}
                fighter2={fighter2}
                headToHeadData={headToHeadData}
            />

            {/* Stats Comparison Section */}
            <StatsComparison 
                fighter1={fighter1}
                fighter2={fighter2}
            />
        </div>
    );
};

export default VersusPage;

