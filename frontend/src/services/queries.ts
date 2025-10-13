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

