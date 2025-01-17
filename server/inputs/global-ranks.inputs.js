const globalRanksInputs = `#graphql
    input FighterInput {
        fighterId: ID!
        score: Float
        rank: Int
        titles: [TitleInput]
        cupAppearances: [CupAppsInput]
        leagueAppearances: [LeagueAppsInput]
    }

    input TitleInput {
        competitionId: ID!
        numberOfTitles: Int!
    }

    input CupAppsInput {
        competitionId: ID!
        appearances: Int
    }

    input LeagueAppsInput {
        competitionId: ID!
        divisionAppearances: [DivisionAppsInput]
    }

    input DivisionAppsInput {
        division: Int
        appearances: Int
    }

    input GlobalRankListInput {
        fighters: [FighterInput!]!
        createdAt: String
        updatedAt: String
        isCurrent: Boolean
    }
`;

export default globalRanksInputs;
