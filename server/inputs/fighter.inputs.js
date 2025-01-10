const fighterInputs = `#graphql
    input StreakInput {
        competitionId: ID
        type: String
        start: LeagueFightSchemaInput
        end: LeagueFightSchemaInput
        count: Int
        active: Boolean
        opponents: [FighterInput]
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

    input TitlesInput {
        totalTitles: Int
        details: [TitlesDetailInput]
    }

    input TitlesDetailInput {
        competitionSeasonId: ID
        seasonNumber: Int
        divisionNumber: Int
    }

    input CompetitionDetailsInput {
        competitionId: ID!
        season: Int
        division: Int
        round: Int
        fightId: ID!
        isWinner: Boolean
        competitionDetails: CompetitionSeasonInput
        fight: FightInput
    }

    input CompetitionHistoryInput {
        competitionId: ID
        numberOfSeasonAppearances: Int
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        titles: [TitlesInput]
        competition: CompetitionSeasonInput
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

    input LocationInput {
        city: String
        country: String
    }

    input DebutInput {
        competitionId: ID
        season: Int
        fightId: ID
        dateOfDebut: String
    }

    input FighterEarningsInput {
        earningsInEur: Float
        earningsBreakdown: [EarningsBreakdownInput]
    }

    input EarningsBreakdownInput {
        competitionMetaId: ID
        competitionId: ID
        season: Int
        perFightFeeInEur: Float
        totalFights: Int
        winningPrizeInEur: Float
        wonFighterOfTheSeason: Boolean
        fighterOfTheSeasonAwardMoneyInEur: Float
        totalEarningsInEur: Float
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
        location: LocationInput
        debutInformation: DebutInput
        images: [String]
        earnings: [FighterEarningsInput]
    }
`;

export default fighterInputs;
