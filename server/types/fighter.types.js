const fighterTypes = `#graphql
    type StreakData {
        competitionId: ID
        type: String
        start: LeagueFightSchemaData
        end: LeagueFightSchemaData
        count: Int
        active: Boolean
        opponents: [Fighter]
        competitionMeta: CompetitionMeta
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
        numberOfSeasonAppearances: Int
        totalFights: Int
        totalWins: Int
        totalLosses: Int
        winPercentage: Float
        titles: TitlesData
        seasonDetails: [SeasonDetailsData]
        competitionMeta: CompetitionMeta!
    }

    type TitlesData {
        totalTitles: Int
        details: [TitlesDetailData]
    }

    type TitlesDetailData {
        competitionSeasonId: ID
        seasonNumber: Int
        divisionNumber: Int
        competition: Competition
    }

    type SeasonDetailsData {
        seasonNumber: Int
        divisionNumber: Int
        fights: Int
        wins: Int
        losses: Int
        points: Int
        winPercentage: Float
        finalPosition: Int
        finalCupPosition: String
    }

    type LocationData {
        city: String
        country: String
    }

    type DebutData {
        competitionId: ID
        season: Int
        fightId: ID
        dateOfDebut: Date
        competitionMeta: CompetitionMeta
    }

    type EarningData {
        earningsInEur: Float
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

    type PhysicalAttributesData {
        heightCm: Float
        heightFeet: String
        weightKg: Float
        armReach: Float
        legReach: Float
        bodyType: String
        koPower: Float
        durability: Float
        strength: Float
        endurance: Float
        agility: Float
    }
`;

export default fighterTypes;
