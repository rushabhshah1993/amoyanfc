/**
 * GraphQL Type Definitions for AI-powered Fight Generation
 * 
 * This module defines the GraphQL schema for generating fight results
 * using OpenAI's ChatGPT model.
 */

const fightGenerationTypeDef = `#graphql
    """
    Input for simulating a fight where AI chooses the winner
    """
    input SimulateFightInput {
        """
        ID of the competition
        """
        competitionId: ID!

        """
        Season number
        """
        seasonNumber: Int!

        """
        Division number (for league competitions)
        """
        divisionNumber: Int

        """
        Round number
        """
        roundNumber: Int!

        """
        Fight index within the round
        """
        fightIndex: Int!

        """
        ID of the first fighter
        """
        fighter1Id: ID!

        """
        ID of the second fighter
        """
        fighter2Id: ID!

        """
        Optional date for the fight
        """
        fightDate: Date
    }

    """
    Input for generating a fight with user-selected winner
    """
    input GenerateFightWithWinnerInput {
        """
        ID of the competition
        """
        competitionId: ID!

        """
        Season number
        """
        seasonNumber: Int!

        """
        Division number (for league competitions)
        """
        divisionNumber: Int

        """
        Round number
        """
        roundNumber: Int!

        """
        Fight index within the round
        """
        fightIndex: Int!

        """
        ID of the first fighter
        """
        fighter1Id: ID!

        """
        ID of the second fighter
        """
        fighter2Id: ID!

        """
        ID of the winner (must be either fighter1Id or fighter2Id)
        """
        winnerId: ID!

        """
        Optional user-provided description of the fight
        """
        userDescription: String

        """
        Optional date for the fight
        """
        fightDate: Date
    }

    """
    Response type for fight generation
    """
    type FightGenerationResult {
        """
        Success status
        """
        success: Boolean!

        """
        Success or error message
        """
        message: String!

        """
        The generated fight with all details
        """
        fight: Fight

        """
        The updated competition with the fight result
        """
        competition: Competition
    }

    """
    Extended mutations for fight generation
    """
    type Mutation {
        """
        Simulates a fight where AI determines the winner and generates description and stats
        """
        simulateFight(input: SimulateFightInput!): FightGenerationResult!

        """
        Generates a fight result with user-specified winner and optional description
        """
        generateFightWithWinner(input: GenerateFightWithWinnerInput!): FightGenerationResult!
    }
`;

export default fightGenerationTypeDef;

