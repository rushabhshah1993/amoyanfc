const leagueDataTypeDef = `#graphql
    """
    The data that represents the complete information 
    about a particular season in a league-style competition.
    """
    type LeagueData {
        """
        It is an array of object where every object represents
        an individual division of a particular season in a 
        league-style competition.
        """
        divisions: [LeagueDivision]

        """
        It is an array of object where every object defines
        a division and the active round in that division at
        a given time.
        """
        activeLeagueFights: [ActiveLeagueFight]
    }

    """
    It represents the data of an individual division
    in a given season.
    """
    type LeagueDivision {
        """
        It represents the unique number of the division
        for a particular season
        """
        divisionNumber: Int!

        """
        It represents the name provided to the division. 
        It defaults to 'Division {number}'
        """
        divisionName: String

        """
        An integer value that defines the total number of 
        rounds of fights in a particular division.
        """
        totalRounds: Int

        """
        An integer value that defines the current active round.
        """
        currentRound: Int

        """
        An array of object where every object represents the
        individual round of a particular division in a 
        particular season.
        """
        rounds: [Round]      
    }

    """
    This data represents an object describing the current
    active division and round in a particular season.
    """
    type ActiveLeagueFight {
        """
        It represents the integral value of the division 
        that is currently active for a particular active
        season.
        """
        division: Int!

        """
        It represents the integral value of the round that 
        is currently active in a particular division for 
        a particular season.
        """
        round: Int!
    }

    """
    It represent the contextual information about a 
    particular round in a division.
    """
    type Round {
        """
        It represents the unique identification for a 
        particular round of a division by its integer value.
        """
        roundNumber: Int!

        """
        It represents an array of objects where every 
        individual object represents an individual fight
        in a round.
        """
        fights: [Fight!]
    }
`;

export default leagueDataTypeDef;
