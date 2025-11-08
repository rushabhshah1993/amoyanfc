const competitionTypes = `#graphql
    scalar Date

    type CompetitionSeasonMeta {
        seasonNumber: Int!
        startDate: Date
        endDate: Date
        winners: [Fighter]
        leagueDivisions: [SeasonMetaLeagueDivision]
        cupParticipants: SeasonMetaCupParticipants
    }

    type SeasonMetaCupParticipants {
        fighters: [Fighter]
    }

    type SeasonMetaLeagueDivision {
        divisionNumber: Int
        fighters: [Fighter]
        winners: [Fighter]
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
        _id: ID
        fighter1: ID
        fighter2: ID
        winner: ID
        fightIdentifier: String
        date: Date
        userDescription: String
        genAIDescription: String
        isSimulated: Boolean
        fighterStats: [IndividualFighterStats]
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
        perFightFeePerDivision: [PerFightFeePerDivision]
        winningFeePerDivision: [WinningFeePerDivision]
        fighterOfTheSeasonPrizeMoneyInEur: Float
        pointsPerWin: Int
    }

    type PerFightFeePerDivision {
        divisionNumber: Int
        fightFeeInEur: Float
    }

    type WinningFeePerDivision {
        divisionNumber: Int
        prizeMoneyInEur: Float
    }

    type FightersPerDivision {
        divisionNumber: Int
        numberOfFighters: Int
    }

    type SeasonCupConfiguration {
        knockoutRounds: Int
        numberOfFighters: Int
        perFightFeeInEur: Float
        winningFeeInEur: Float
        stages: [String]
    }

    type CompetitionLinkedLeagueSeason {
        competition: CompetitionMeta
        season: LinkedSeasonInfo
    }

    type LinkedSeasonInfo {
        id: ID
        seasonNumber: Int
        leagueDivisions: [SeasonMetaLeagueDivision]
    }
`;

export default competitionTypes;
