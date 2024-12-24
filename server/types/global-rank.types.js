const globalRankTypes = `#graphql
    type FighterGlobalRankData {
        fighterId: ID!
        score: Float
        rank: Int
        titles: [TitleData]
        cupAppearances: [CupAppsData]
        leagueAppearances: [LeagueAppsData]
        fighter: Fighter
    }

    type TitleData {
        competitionId: ID!
        numberOfTitles: Int!
        competition: CompetitionMeta
    }

    type CupAppsData {
        competitionId: ID!
        appearances: Int
        competition: CompetitionMeta
    }

    type LeagueAppsData {
        competitionId: ID!
        divisionAppearances: [DivisionAppsData]
        competition: CompetitionMeta
    }

    type DivisionAppsData {
        division: Int
        appearances: Int
    }
`;

export default globalRankTypes;