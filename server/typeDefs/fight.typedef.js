const fightTypeDef = `#graphql
    """
    Represents an individual fight, irrespective of the
    type of competition. This data object contains
    information about the two participating fighters and 
    the various contextual information about the fight
    between the two.
    """
    type Fight {
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
        date: String

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
        fighterStats: FightStatsInput

        """
        The property that defines whether the fight is 
        pending or has been completed. By default, the
        value of this property is pending.
        """
        fightStatus: String
    }
`;

export default fightTypeDef;
