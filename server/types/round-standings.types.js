const roundStandingsTypes = `#graphql
    type IndividualRoundStandingData {
        fighterId: ID!
        fightsCount: Int!
        wins: Int!
        points: Int!
        rank: Int!
        totalFightersCount: Int!
    }
`;

export default roundStandingsTypes;
