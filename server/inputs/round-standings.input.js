const roundStandingsInput = `#graphql
    input IndividualRoundStandingInput {
        fighterId: ID!
        fightsCount: Int!
        wins: Int!
        points: Int!
        rank: Int!
        totalFightersCount: Int!
    }

    input RoundFilterInput {
        seasonNumber: Int
        divisionNumber: Int
        roundNumber: Int
        fightId: ID
    }

    input RoundStandingInput {
        competitionId: ID
        seasonNumber: Int
        divisionNumber: Int
        roundNumber: Int
        fightId: ID
        standings: [IndividualRoundStandingInput]
    }
`;

export default roundStandingsInput;
