import { gql } from '@apollo/client';

export const GET_COMPETITIONS = gql`
  query GetCompetitions {
    getAllCompetitionsMeta {
      id
      competitionName
      type
      description
      logo
      shortName
    }
  }
`;
