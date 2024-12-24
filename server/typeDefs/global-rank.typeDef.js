/* Inputs imports */
import globalRankInputs from '../inputs/global-ranks.inputs.js';

const globalRankTypeDef = `#graphql
    """
    Represents a list of global ranks that includes a fighter's performance
    over a specific time period. Global rank is calculated only once a few
    months. Every GlobalRank object will correspond to a list of fighters
    ranked at a given point in time, for example, February 2024. The next 
    list could be out in October 2024 (not fixed);
    """
    type GlobalRank {
        """
        Unique ID identifying a temporal list of global ranks
        """
        id: ID!

        """
        List of fighters sorted by their rank
        """
        fighters: [Fighter!]!

        """
        ISO date string representing the time this list was created
        """
        createdAt: String

        """
        ISO date string representing the time this list was last updated
        """
        updatedAt: String

        """
        Denotes if the list is currently active
        """
        isCurrent: Boolean!
    }

    """
    Root query for global ranks
    """
    type Query {
        """
        Fetch a list of all the global ranks from its inception
        """
        getAllGlobalRanks: [GlobalRank!]

        """
        Fetch the current active list of global rank
        """
        getCurrentGlobalRank: GlobalRank

        """
        Fetch the filtered list of global ranks based on arguments provided
        """
        filterGlobalRanks: [GlobalRank]
    }

    """
    Root mutation
    """
    type Mutation {
        """
        Add a new list to the global ranks
        """
        addNewGlobalRankList(input: GlobalRankListInput): [GlobalRank!]

        """
        Update an object from the  list of global ranks
        """
        updateGlobalRankList(id: ID!, input: GlobalRankListInput): GlobalRank

        """
        Delete an object from the global ranks list
        """
        deleteGlobalRankList(id: ID!): String
    }

    ${globalRankInputs}
`;

export default globalRankTypeDef;
