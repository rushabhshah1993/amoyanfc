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
                }
            }
        }
    }
`;

