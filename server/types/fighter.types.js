const fighterTypes = `#graphql
    type StreakData {
        competitionId: ID
        type: String
        start: LeagueFightSchemaData
        end: LeagueFightSchemaData
        count: Int
        active: Boolean
        opponents: [Fighter]
    }

    type LeagueFightSchemaData {
        season: Int
        division: Int
        round: Int
    }

    type OpponentHistoryData {
        opponentId: ID!
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        details: [CompetitionDetailsData]
    }

    type CompetitionDetailsData {
        competitionId: ID!
        season: Int
        division: Int
        round: Int
        fightId: ID!
        isWinner: Boolean
        competitionDetails: CompetitionSeason
        fight: Fight
    }

    type CompetitionHistoryData {
        competitionId: ID
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        competition: Competition
    }
`;

export default fighterTypes;
