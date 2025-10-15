import { gql } from '@apollo/client';

export const GET_COMPETITIONS = gql`
    query GetAllCompetitionsMeta {
        getAllCompetitionsMeta {
            id
            competitionName
            description
            logo
            shortName
            type
        }
    }
`;

export const GET_ALL_FIGHTERS = gql`
    query GetAllFighters {
        getAllFighters {
            id
            firstName
            lastName
            profileImage
            location {
                city
                country
            }
            physicalAttributes {
                heightCm
                heightFeet
                weightKg
                armReach
                legReach
                bodyType
                koPower
                durability
                strength
                endurance
                agility
            }
        }
    }
`;

export const GET_FIGHTER_INFORMATION = gql`
    query GetFighterInformation($id: ID!) {
        getFighterInformation(id: $id) {
            id
            firstName
            lastName
            dateOfBirth
            profileImage
            skillset
            location {
                city
                country
            }
            physicalAttributes {
                heightCm
                heightFeet
                weightKg
                armReach
                legReach
                bodyType
                koPower
                durability
                strength
                endurance
                agility
            }
            opponentsHistory {
                opponentId
                totalFights
                totalWins
                totalLosses
                winPercentage
                details {
                    competitionId
                    season
                    division
                    round
                    fightId
                    isWinner
                }
            }
            competitionHistory {
                competitionId
                numberOfSeasonAppearances
                totalFights
                totalWins
                totalLosses
                winPercentage
                competitionMeta {
                    id
                    competitionName
                    logo
                }
                titles {
                    totalTitles
                    details {
                        competitionSeasonId
                        seasonNumber
                        divisionNumber
                        competition {
                            id
                            seasonMeta {
                                seasonNumber
                                leagueDivisions {
                                    divisionNumber
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

export const GET_COMPETITION_META = gql`
    query GetCompetitionMeta($id: ID!) {
        getCompetitionMeta(id: $id) {
            id
            competitionName
            type
            logo
            description
            shortName
        }
    }
`;

export const GET_ALL_SEASONS_BY_COMPETITION = gql`
    query GetAllSeasonsByCompetitionCategory($competitionMetaId: ID!) {
        getAllSeasonsByCompetitionCategory(competitionMetaId: $competitionMetaId) {
            id
            isActive
            seasonMeta {
                seasonNumber
                startDate
                endDate
                winners {
                    id
                    firstName
                    lastName
                    profileImage
                }
                leagueDivisions {
                    divisionNumber
                    fighters {
                        id
                        firstName
                        lastName
                    }
                    winners {
                        id
                        firstName
                        lastName
                        profileImage
                    }
                }
            }
            leagueData {
                divisions {
                    divisionNumber
                    divisionName
                    currentRound
                    totalRounds
                }
            }
        }
    }
`;

export const GET_SEASON_DETAILS = gql`
    query GetCompetitionSeason($id: ID!) {
        getCompetitionSeason(id: $id) {
            id
            isActive
            seasonMeta {
                seasonNumber
                startDate
                endDate
                winners {
                    id
                    firstName
                    lastName
                    profileImage
                }
                leagueDivisions {
                    divisionNumber
                    fighters {
                        id
                        firstName
                        lastName
                        profileImage
                    }
                    winners {
                        id
                        firstName
                        lastName
                        profileImage
                    }
                }
            }
            leagueData {
                divisions {
                    divisionNumber
                    divisionName
                    currentRound
                    totalRounds
                    rounds {
                        roundNumber
                        fights {
                            fighter1
                            fighter2
                            winner
                            fightIdentifier
                            date
                            fightStatus
                        }
                    }
                }
            }
        }
    }
`;

// Round Standings Queries
export const GET_ROUND_STANDINGS_BY_ROUND = gql`
    query GetRoundStandingsByRound(
        $competitionId: ID!
        $seasonNumber: Int!
        $divisionNumber: Int!
        $roundNumber: Int!
    ) {
        getRoundStandingsByRound(
            competitionId: $competitionId
            seasonNumber: $seasonNumber
            divisionNumber: $divisionNumber
            roundNumber: $roundNumber
        ) {
            id
            competitionId
            seasonNumber
            divisionNumber
            roundNumber
            fightId
            fightIdentifier
            standings {
                fighterId
                fightsCount
                wins
                points
                rank
                totalFightersCount
            }
            createdAt
            updatedAt
        }
    }
`;

export const GET_FINAL_SEASON_STANDINGS = gql`
    query GetFinalSeasonStandings(
        $competitionId: ID!
        $seasonNumber: Int!
        $divisionNumber: Int!
    ) {
        getFinalSeasonStandings(
            competitionId: $competitionId
            seasonNumber: $seasonNumber
            divisionNumber: $divisionNumber
        ) {
            id
            standings {
                fighterId
                fightsCount
                wins
                points
                rank
                totalFightersCount
            }
        }
    }
`;
