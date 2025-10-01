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

