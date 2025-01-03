const competitionTypes = `#graphql
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
        competitionId: ID!
        seasonId: ID!
    }
`;

export default competitionTypes;
