const competitionInputs = `#graphql
    input CompetitionSeasonInput {
        competitionMetaId: ID!
        isActive: Boolean
        seasonMeta: SeasonMetaInput
        leagueData: LeagueDataInput
        cupData: CupDataInput
        config: SeasonConfigurationInput
        linkedLeagueSeason: LinkedLeagueSeasonInput
        createdAt: String
    }

    input CompetitionFilterInput {
        competitionMeta: CompetitionMetaInput
        isActive: Boolean
        seasonMeta: SeasonMetaInput
        leagueData: LeagueDataInput
        cupData: CupDataInput
        config: SeasonConfigurationInput
        linkedLeagueSeason: LinkedLeagueSeasonInput
        createdAt: String
    }

    input CompetitionMetaInput {
        id: ID
        competitionName: String
        type: String
        description: String
        logo: String
    }

    input SeasonMetaInput {
        seasonNumber: Int!
        startDate: String
        endDate: String
        leagueDivision: [LeagueDivisionInput]
        cupParticipants: CupParticipantsInput
    }

    input LeagueDivisionInput {
        divisionNumber: Int
        fighters: [ID!]
    }

    input CupParticipantsInput {
        fighters: [ID!]
    }

    input LeagueDataInput {
        divisions: [DivisionInput]
        activeLeagueFights: [ActiveLeagueFightsInput]
    }

    input DivisionInput {
        divisionNumber: Int!
        divisionName: String
        totalRounds: Int
        currentRound: Int
        rounds: [RoundInput]
    }

    input RoundInput {
        roundNumber: Int
        fights: [FightInput]
    }

    input ActiveLeagueFightsInput {
        division: Int
        round: Int
    }

    input CupDataInput {
        fights: [FightInput],
        currentStage: String
    }

    input FightInput {
        fighter1: ID
        fighter2: ID
        winner: ID
        fightIdentifier: String
        date: String
        userDescription: String
        genAIDescription: String
        isSimulated: Boolean
        fighterStats: [FightStatsInput]
        fightStatus: String
    }

    input SeasonConfigurationInput {
        leagueConfiguration: LeagueConfigurationInput
        cupConfiguration: CupConfigurationInput
    }

    input LeagueConfigurationInput {
        numberOfDivisions: Int
        fightersPerDivision: [FightersPerDivisionInput]
        perFightFeePerDivision: [PerFightFeePerDivision]
        winningFeePerDivision: [WinningFeePerDivision]
        fighterOfTheSeasonPrizeMoneyInEur: Float
        pointsPerWin: Int
    }

    input PerFightFeePerDivision {
        divisionNumber: Int
        fightFeeInEur: Float
    }

    input WinningFeePerDivision {
        divisionNumber: Int
        prizeMoneyInEur: Float
    }

    input FightersPerDivisionInput {
        divisionNumber: Int
        numberOfFighters: Int
    }

    input CupConfigurationInput {
        knockoutRounds: Int
        numberOfFighters: Int
        perFightFeeInEur: Float
        winningFeeInEur: Float
        stages: [String]
    }

    input LinkedLeagueSeasonInput {
        competitionId: ID!
        seasonId: ID!
    }
`;

export default competitionInputs;