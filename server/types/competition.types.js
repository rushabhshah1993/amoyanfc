const competitionTypes = `#graphql
    # type CompetitionSeason {
    #     competitionMetaId: ID!
    #     isActive: Boolean
    #     seasonMeta: CompetitionSeasonMeta
    #     leagueData: CompetitionLeagueData
    #     cupData: CompetitionCupData
    #     config: CompetitionSeasonConfiguration
    #     linkedLeagueSeason: CompetitionLinkedLeagueSeason
    #     createdAt: String
    # }

    type CompetitionSeasonMeta {
        seasonNumber: Int!
        startDate: String
        endDate: String
        leagueDivision: [SeasonMetaLeagueDivision]
        cupParticipants: SeasonMetaCupParticipants
    }

    type SeasonMetaCupParticipants {
        fighters: [ID!]
    }

    type SeasonMetaLeagueDivision {
        divisionNumber: Int
        fighters: [ID!]
    }

    type CompetitionLeagueData {
        divisions: [CompetitionLeagueDivision]
        activeLeagueFights: [CompetitionActiveLeagueFights]
    }

    type CompetitionCupData {
        fights: [CompetitionFight],
        currentStage: String
    }

    type CompetitionLeagueDivision {
        divisionNumber: Int!
        divisionName: String
        totalRounds: Int
        currentRound: Int
        rounds: [LeagueDivisionRound]
    }

    type LeagueDivisionRound {
        roundNumber: Int
        fights: [CompetitionFight]
    }

    type CompetitionFight {
        fighter1: ID
        fighter2: ID
        winner: ID
        fightIdentifier: String
        date: String
        userDescription: String
        genAIDescription: String
        isSimulated: Boolean
        fighterStats: [FightStats]
        fightStatus: String
    }

    type CompetitionActiveLeagueFights {
        division: Int
        round: Int
    }

    type CompetitionSeasonConfiguration {
        leagueConfiguration: SeasonLeagueConfiguration
        cupConfiguration: SeasonCupConfiguration
    }

    type SeasonLeagueConfiguration {
        numberOfDivisions: Int
        fightersPerDivision: [FightersPerDivision]
        pointsPerWin: Int
    }

    type FightersPerDivision {
        divisionNumber: Int
        numberOfFighters: Int
    }

    type SeasonCupConfiguration {
        knockoutRounds: Int
        numberOfFighters: Int
        stages: [String]
    }

    type CompetitionLinkedLeagueSeason {
        competitionId: ID!
        seasonId: ID!
    }
`;

export default competitionTypes;
