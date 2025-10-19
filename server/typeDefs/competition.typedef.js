/* Input imports */
import competitionInputs from "../inputs/competition.inputs.js";
import fightStatsInput from "../inputs/fight-stats.input.js";

/* Types imports */
import competitionTypes from "../types/competition.types.js";
import fightStatsTypes from "../types/fight-stats.types.js";

const competitionTypeDef = `#graphql
    """
    Represents a detailed competition's season in the system, for instance, Season 9 of IFC or Season 2 of Brawl
    """
    type Competition {
        """
        Unique ID for the competition's seasonal information
        """
        id: ID!

        """
        Meta information about the competition
        """
        competitionMetaId: ID!

        """
        Competition Meta information
        """
        competitionMeta: CompetitionMeta

        """
        Indicates whether the competition is currently active
        """
        isActive: Boolean!

        """
        Contextual information about the associated season.
        For example, season 9 of IFC or season 2 of Brawl will have the season's associated information here.
        It will contain information like the start date, end date, and participants that will be common for 
        league and cup-style competitions. Additionally, it will contain more contextual information for league-style
        competitions.
        """
        seasonMeta: CompetitionSeasonMeta

        """
        Data specific to league-style competitions
        """
        leagueData: CompetitionLeagueData

        """
        Data specific to cup-style competitions
        """
        cupData: CompetitionCupData

        """
        Configuration data for the given competition
        """
        config: CompetitionSeasonConfiguration

        """
        Information specific to cup-type competitions which are linked to a 
        league-style competitions
        """
        linkedLeagueSeason: CompetitionLinkedLeagueSeason

        """
        Date when the competition was created
        """
        createdAt: String

        """
        Date when the competition was last updated.
        """
        updatedAt: String
    }

    """
    Data specific to cup-style competitions that 
    represent a particular competition and its season
    they are linked to
    """
    type LinkedLeagueSeason {
        competition: Competition
        season: CompetitionSeasonMeta
    }

    """
    Root query for fetching competition data.
    """
    type Query {
        """
        Fetch an individual competition's information
        """
        getCompetitionSeason(id: ID!): Competition

        """
        Fetch information for all competitions
        """
        getAllCompetitions: [Competition!]

        """
        Fetch a list of competitions by its competition-type (e.g. IFC, IC, CC, Brawl)
        """
        getAllSeasonsByCompetitionCategory(competitionMetaId: ID!): [Competition!]

        """
        Fetch a list of competitions based on the filters provided by the user
        """
        filterCompetitions(filter: CompetitionFilterInput!): [Competition!]

        """
        Fetch a specific fight by its MongoDB ID
        """
        getFightById(id: ID!): FightWithContext

        """
        Fetch a specific cup fight by its MongoDB ID
        """
        getCupFightById(id: ID!): FightWithContext
    }   

    """
    Root mutation for modifying the data
    """
    type Mutation {
        """
        Creates a new season for a given competition
        """
        createCompetitionSeason(input: CompetitionSeasonInput!): Competition!

        """
        Updates an existing competition's information
        """
        updateCompetitionSeason(id: ID!, input: CompetitionSeasonInput!): Competition!

        """
        Deletes an exisiting competition
        """
        deleteCompetitionSeason(id: ID!): String
    }

    ${competitionTypes}
    ${competitionInputs}
    ${fightStatsTypes}
    ${fightStatsInput}
`;

export default competitionTypeDef;
