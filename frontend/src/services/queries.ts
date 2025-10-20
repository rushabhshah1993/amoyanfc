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

export const GET_ALL_FIGHTERS_WITH_STATS = gql`
    query GetAllFightersWithStats {
        getAllFightersWithBasicStats {
            id
            firstName
            lastName
            dateOfBirth
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
            totalFights
            totalWins
            totalLosses
            winPercentage
            totalSeasons
            totalOpponents
            totalTitles
            highestWinStreak
            highestLoseStreak
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
            debutInformation {
                competitionId
                season
                fightId
                dateOfDebut
                competitionMeta {
                    id
                    competitionName
                    logo
                }
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
                    }
                }
                seasonDetails {
                    seasonNumber
                    divisionNumber
                    fights
                    wins
                    losses
                    points
                    winPercentage
                    finalPosition
                    finalCupPosition
                }
            }
            streaks {
                competitionId
                type
                start {
                    season
                    division
                    round
                }
                end {
                    season
                    division
                    round
                }
                count
                active
                opponents {
                    id
                    firstName
                    lastName
                    profileImage
                }
                competitionMeta {
                    id
                    competitionName
                    logo
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
                cupParticipants {
                    fighters {
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
            cupData {
                fights {
                    _id
                    fighter1
                    fighter2
                    winner
                    fightIdentifier
                    date
                }
                currentStage
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
                cupParticipants {
                    fighters {
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
                            _id
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
            cupData {
                fights {
                    _id
                    fighter1
                    fighter2
                    winner
                    fightIdentifier
                    date
                }
                currentStage
            }
            linkedLeagueSeason {
                competition {
                    id
                    competitionName
                    shortName
                }
                season {
                    id
                    seasonNumber
                    leagueDivisions {
                        divisionNumber
                        fighters {
                            id
                            firstName
                            lastName
                        }
                    }
                }
            }
            competitionMeta {
                id
                competitionName
                shortName
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

export const GET_CUP_FIGHT_BY_ID = gql`
    query GetCupFightById($id: ID!) {
        getCupFightById(id: $id) {
            id
            fighter1 {
                id
                firstName
                lastName
                profileImage
            }
            fighter2 {
                id
                firstName
                lastName
                profileImage
            }
            winner {
                id
                firstName
                lastName
            }
            fightIdentifier
            date
            userDescription
            genAIDescription
            isSimulated
            fighterStats {
                fighterId
                stats {
                    fightTime
                    finishingMove
                    grappling {
                        accuracy
                        defence
                    }
                    significantStrikes {
                        accuracy
                        attempted
                        defence
                        landed
                        landedPerMinute
                        positions {
                            clinching
                            ground
                            standing
                        }
                    }
                    strikeMap {
                        head {
                            absorb
                            strike
                        }
                        torso {
                            absorb
                            strike
                        }
                        leg {
                            absorb
                            strike
                        }
                    }
                    submissions {
                        attemptsPer15Mins
                        average
                    }
                    takedowns {
                        accuracy
                        attempted
                        avgTakedownsLandedPerMin
                        defence
                        landed
                    }
                }
            }
            fightStatus
            competitionContext {
                competitionId
                competitionName
                competitionLogo
                seasonNumber
                divisionNumber
                divisionName
                roundNumber
            }
        }
    }
`;

export const GET_FIGHT_BY_ID = gql`
    query GetFightById($id: ID!) {
        getFightById(id: $id) {
            id
            fightIdentifier
            date
            userDescription
            genAIDescription
            isSimulated
            fightStatus
            fighter1 {
                id
                firstName
                lastName
                profileImage
            }
            fighter2 {
                id
                firstName
                lastName
                profileImage
            }
            winner {
                id
                firstName
                lastName
                profileImage
            }
            fighterStats {
                fighterId
                stats {
                    fightTime
                    finishingMove
                    grappling {
                        accuracy
                        defence
                    }
                    significantStrikes {
                        accuracy
                        attempted
                        defence
                        landed
                        landedPerMinute
                        positions {
                            clinching
                            ground
                            standing
                        }
                    }
                    strikeMap {
                        head {
                            absorb
                            strike
                        }
                        torso {
                            absorb
                            strike
                        }
                        leg {
                            absorb
                            strike
                        }
                    }
                    submissions {
                        attemptsPer15Mins
                        average
                    }
                    takedowns {
                        accuracy
                        attempted
                        avgTakedownsLandedPerMin
                        defence
                        landed
                    }
                }
            }
            competitionContext {
                competitionId
                competitionName
                competitionLogo
                seasonNumber
                divisionNumber
                divisionName
                roundNumber
            }
        }
    }
`;
