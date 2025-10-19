import fightStatsTypes from "../types/fight-stats.types.js";

const fightTypeDef = `#graphql
    scalar Date

    """
    Represents an individual fight, irrespective of the
    type of competition. This data object contains
    information about the two participating fighters and 
    the various contextual information about the fight
    between the two.
    """
    type Fight {
        """
        MongoDB generated unique ID representing an individual fight
        """
        _id: ID

        """
        A unique ID representing an individual fight
        """
        id: ID!

        """
        An ID representing the first fighter of the fight
        """
        fighter1: Fighter

        """
        An ID representing the second fighter of the fight
        """
        fighter2: Fighter

        """
        The ID of the winner amongst fighter1 and fighter2.
        """
        winner: Fighter

        """
        A unique identifier that defines a given round of a competition
        in which the fight has taken place
        """
        fightIdentifier: String

        """
        A date string representing the date on which the fight
        was fought
        """
        date: Date

        """
        An optional parameter that will provide user-provided 
        description of the fight. This property will be provided
        in the API only if the isSimualate flag is 'false'. 
        """
        userDescription: String

        """
        It represent the AI-generated response provided 
        by ChatGPT for a particular fight.
        """
        genAIDescription: String

        """
        A boolean property that defines if the user opted to
        simulate this fight.
        """
        isSimulated: Boolean

        """
        It represents the statistics shared by ChatGPT
        at the conclusion of a fight.
        """
        fighterStats: FightStats

        """
        The property that defines whether the fight is 
        pending or has been completed. By default, the
        value of this property is pending.
        """
        fightStatus: String
    }

    """
    Represents the statistics for a single fighter in a specific fight
    """
    type IndividualFighterStats {
        """
        The ID of the fighter
        """
        fighterId: ID

        """
        The statistics for this fighter in this fight
        """
        stats: FightStatistics
    }

    """
    Represents the actual statistics from a fight
    """
    type FightStatistics {
        """
        The time taken for the fight to complete
        """
        fightTime: Float

        """
        The finishing move used by the winner
        """
        finishingMove: String

        """
        Grappling statistics
        """
        grappling: GrapplingData

        """
        Significant strikes statistics
        """
        significantStrikes: SignificantStrikesData

        """
        Strike map showing strikes by body part
        """
        strikeMap: StrikeMapData

        """
        Submission statistics
        """
        submissions: SubmissionData

        """
        Takedown statistics
        """
        takedowns: TakedownData
    }

    """
    Represents contextual information about where a fight took place
    """
    type FightCompetitionContext {
        """
        The ID of the competition season
        """
        competitionId: ID

        """
        The name of the competition
        """
        competitionName: String

        """
        The logo of the competition
        """
        competitionLogo: String

        """
        The season number
        """
        seasonNumber: Int

        """
        The division number
        """
        divisionNumber: Int

        """
        The division name
        """
        divisionName: String

        """
        The round number
        """
        roundNumber: Int
    }

    """
    Represents a fight with additional competition context
    """
    type FightWithContext {
        """
        A unique ID representing an individual fight
        """
        id: ID

        """
        The first fighter
        """
        fighter1: Fighter

        """
        The second fighter
        """
        fighter2: Fighter

        """
        The winner of the fight
        """
        winner: Fighter

        """
        A unique identifier for the fight
        """
        fightIdentifier: String

        """
        The date of the fight
        """
        date: Date

        """
        User-provided description of the fight
        """
        userDescription: String

        """
        AI-generated description of the fight
        """
        genAIDescription: String

        """
        Whether the fight was simulated
        """
        isSimulated: Boolean

        """
        Fight statistics for both fighters
        """
        fighterStats: [IndividualFighterStats]

        """
        The status of the fight
        """
        fightStatus: String

        """
        Competition context information
        """
        competitionContext: FightCompetitionContext
    }

    ${fightStatsTypes}
`;

export default fightTypeDef;
