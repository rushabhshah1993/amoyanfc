/* Input imports */
import fightStatsInput from "../inputs/fight-stats.input";
import fighterInputs from "../inputs/fighter.inputs";

const fighterTypeDef = `#graphql
    type Fighter {
        id: ID!
        firstName: String!
        lastName: String!
        dateOfBirth: String
        profileImage: String
        skillset: [String]
        globalRank: GlobalRank
        fightStats: FightStatsInput
        streaks: [StreakInput]
        opponentsHistory: [OpponentHistoryInput]
        competitionHistory: [competitionHistoryInput]
    }

    ${fightStatsInput}
    ${fighterInputs}
`;

export default fighterTypeDef;
