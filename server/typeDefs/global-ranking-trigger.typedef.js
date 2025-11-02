/**
 * GraphQL Type Definitions for Global Ranking Triggers
 */

const globalRankingTriggerTypeDef = `#graphql
    """
    Result of global ranking calculation
    """
    type GlobalRankingCalculationResult {
        """
        Whether the calculation was successful
        """
        success: Boolean!

        """
        Message describing the result
        """
        message: String!

        """
        The ID of the created global ranking document
        """
        globalRankId: ID

        """
        Total number of fighters ranked
        """
        totalFighters: Int
    }

    """
    Status of season completion check
    """
    type SeasonCompletionStatus {
        """
        Whether all three competitions (League, CC, IC) are completed
        """
        allCompleted: Boolean!

        """
        Whether the league is completed
        """
        leagueCompleted: Boolean!

        """
        Whether the Champions Cup is completed
        """
        ccCompleted: Boolean!

        """
        Whether the Invicta Cup is completed
        """
        icCompleted: Boolean!

        """
        The season number
        """
        seasonNumber: Int

        """
        The name of the league competition
        """
        leagueName: String

        """
        Reason/description of the current status
        """
        reason: String!
    }

    extend type Mutation {
        """
        Manually trigger global ranking calculation
        This is also automatically triggered when all three competitions of a season are completed
        """
        triggerGlobalRankingCalculation(leagueCompetitionMetaId: ID!): GlobalRankingCalculationResult!

        """
        Check the completion status of all competitions for a season
        Used for debugging and testing purposes
        """
        checkSeasonCompletionStatus(leagueSeasonId: ID!): SeasonCompletionStatus!
    }
`;

export default globalRankingTriggerTypeDef;

