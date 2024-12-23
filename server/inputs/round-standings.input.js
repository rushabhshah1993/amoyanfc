const roundStandingsInput = `#graphql
    input RoundStandingInput {
        fighterId: ID!
        fightsCount: Int!
        wins: Int!
        points: Int!
        rank: Int!
        totalFightersCount: Int!
    }

    input RoundFilterInput {
        seasonNumber: Int!
        divisionNumber: Int!
        roundNumber: Int!
    }

    input RoundStandingInput {
        competitionId: ID
        seasonNumber: Int
        divisionNumber: Int
        roundNumber: Int
        fightId: ID
        standings: [RoundStandingInput]
    }
`;

export default roundStandingsInput;
