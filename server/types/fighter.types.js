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
        competitionDetails: Competition
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

    type LocationData {
        city: String
        country: String
    }

    type DebutData {
        competitionId: ID
        season: Int
        fightId: ID
        dateOfDebut: String
    }

    type EarningData {
        earnings: Float
        earningsBreakdown: [EarningsBreakdown]
    }

    type EarningsBreakdown {
        competitionMetaId: ID
        competitionId: ID
        season: Int
        perFightFeeInEur: Float
        totalFights: Int
        winningPrizeInEur: Float
        wonFighterOfTheSeason: Boolean
        fighterOfTheSeasonAwardMoneyInEur: Float
        totalEarningInEurs: Float
    }
`;

export default fighterTypes;
