const roundStandingsTypes = `#graphql
    type IndividualRoundStandingData {
        fighterId: ID!
        fightsCount: Int!
        wins: Int!
        points: Int!
        rank: Int!
        totalFightersCount: Int!
        fighter: Fighter
    }
`;

export default roundStandingsTypes;
