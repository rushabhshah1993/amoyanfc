/* Input imports */
import fightStatsInput from "../inputs/fight-stats.input.js";
import fighterInputs from "../inputs/fighter.inputs.js";

const fighterTypeDef = `#graphql
    """
    Represents the detailed information about a fighter
    """
    type Fighter {
        """
        Unique ID for every fighter
        """
        id: ID!

        """
        First name of the fighter
        """
        firstName: String!

        """
        Last name of the fighter
        """
        lastName: String!

        """
        ISO date string for the birth date of the fighter
        """
        dateOfBirth: String

        """
        URL string for the profile image of the fighter
        """
        profileImage: String

        """
        List of martial art skills that the fighter is trained in
        """
        skillset: [String]

        """
        Current global rank of the fighter
        """
        globalRank: GlobalRank

        """
        Depicts the various fight statistics of a fighter
        """
        fightStats: FightStatsInput

        """
        A list of all the streaks maintained by the fighter
        """
        streaks: [StreakInput]

        """
        A list of all the opponents the fighter has fought and details of every fight fought with the oppponent
        """
        opponentsHistory: [OpponentHistoryInput]

        """
        A list of all the competitions the fighter has fought and its numeric details
        """
        competitionHistory: [CompetitionHistoryInput]

        """
        Informs whether the fighter has been archived by the user
        """
        isArchived: Boolean
    }

    """
    Root query for all the fighters
    """
    type Query {
        """
        Fetch all the fighters
        """
        getAllFighters: [Fighter!]

        """
        Fetches all the fighters who are not archived
        """
        getActiveFighters: [Fighter]

        """
        Fetch an individidual fighter
        """
        getFighterInformation(id: ID!): Fighter

        """
        Fetch a filtered list of fighters based on the arguments provided
        """
        filterFighters(filter: FighterFilterInput!): [Fighter]
    }


    """
    Root mutation for adding/modifying the data
    """
    type Mutation {
        """
        Adds a new fighter to the system
        """
        addNewFighter(input: NewFighterInput!): Fighter!

        """
        Edits the information of an existing fighter
        """
        editFighter(id: ID!, input: FighterInput!): Fighter!

        """
        Delete an existing fighter's information
        """
        archiveFighter(id: ID!): String
    }

    ${fightStatsInput}
    ${fighterInputs}
`;

export default fighterTypeDef;
