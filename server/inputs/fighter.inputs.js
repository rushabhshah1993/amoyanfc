const fighterInputs = `#graphql
    input StreakInput {
        competitionId: ID
        type: String
        start: LeagueFightSchemaInput
        end: LeagueFightSchemaInput
        count: Int
        active: Boolean
        opponents: [Fighter]
    }

    input LeagueFightSchemaInput {
        seasonId: ID
        divisionId: ID
        roundId: ID
    }

    input OpponentHistoryInput {
        opponentId: ID
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        details: [CompetitionDetailsInput]
    }

    input CompetitionDetailsInput {
        competitionId: ID
        seasonId: ID
        divisionId: ID
        roundId: ID
        isWinner: Boolean
    }

    input competitionHistoryInput {
        competitionId: ID
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
    }
`;

export default fighterInputs;
