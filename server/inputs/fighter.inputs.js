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
        opponentId: ID!
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        details: [CompetitionDetailsInput]
    }

    input CompetitionDetailsInput {
        competitionId: ID!
        season: Int
        division: Int
        round: Int
        fightId: ID!
        isWinner: Boolean
        competitionDetails: Competition
        fight: Fight
    }

    input CompetitionHistoryInput {
        competitionId: ID
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        competition: Competition
    }

    input FighterFilterInput {
        firstName: String
        lastName: String
        startDateRange: String
        endDateRange: String
        skillset: [String]
        globalRank: Int
        streaksCount: Int
        competitionName: String 
        isArchived: Boolean
    }

    input NewFighterInput {
        firstName: String!
        lastName: String!
        dateOfBirth: String
        profileImage: String
        skillset: [String]!
        globalRank: Int
        fightStats: FightStatsInput
        streaks: [StreakInput]
        opponentsHistory: [OpponentHistoryInput]
        competitionHistory: [CompetitionHistoryInput]
        isArchived: Boolean
    }

    input FighterInput {
        firstName: String
        lastName: String
        dateOfBirth: String
        profileImage: String
        skillset: [String]
        globalRank: Int
        fightStats: FightStatsInput
        streaks: [StreakInput]
        opponentsHistory: [OpponentHistoryInput]
        competitionHistory: [CompetitionHistoryInput]
        isArchived: Boolean
    }
`;

export default fighterInputs;
