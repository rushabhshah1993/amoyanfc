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
        season: Int
        division: Int
        round: Int
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
        season: Int
        division: Int
        round: Int
        isWinner: Boolean
        competitionDetails: Competition
    }

    input competitionHistoryInput {
        competitionId: ID
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        competition: Competition
    }
`;

export default fighterInputs;
