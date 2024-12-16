const competitionInputs = `#graphql
    input NewCompetitionSeasonInput {
        competitionMetaId: ID!
        isActive: Boolean
        seasonMeta: SeasonMetaInput
        leagueData: LeagueDataInput
        cupData: CupDataInput
        config: SeasonConfigurationInput
        linkedLeagueSeason: LinkedLeagueSeasonInput
        createdAt: String
    }

    input SeasonMetaInput {
        seasonNumber: Int!
        startDate: String
        endDate: String
        leagueDivision: [LeagueDivisionInput]
        cupParticipants: CupParticipantsInput
    }

    input CupParticipantsInput {
        fighters: [ID!]
    }

    input LeagueDivisionInput {
        divisionNumber: Int
        fighters: [ID!]
    }

    input LeagueDataInput {
        divisions: [DivisionInput]
        activeLeagueFights: [ActiveLeagueFightsInput]
    }

    input CupDataInput {
        fights: [FightInput],
        currentStage: String
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

    input ActiveLeagueFightsInput {
        division: Int
        round: Int
    }

    input SeasonConfigurationInput {
        leagueConfiguration: LeagueConfigurationInput
        cupConfiguration: CupConfigurationInput
    }

    input LeagueConfigurationInput {
        numberOfDivisions: Int
        fightersPerDivision: [FightersPerDivisionInput]
        pointsPerWin: Int
    }

    input FightersPerDivisionInput {
        divisionNumber: Int
        numberOfFighters: Int
    }

    input CupConfigurationInput {
        knockoutRounds: Int
        numberOfFighters: Int
        stages: [String]
    }

    input LinkedLeagueSeasonInput {
        competitionId: ID!
        seasonId: ID!
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
`;

export default competitionInputs;