const seasonConfigurationTypeDef = `#graphql
    """
    This data represents an object defining the 
    configuration of a season. It contains two objects:
    an object representing configurations for a 
    league-style tournament and another for a cup-style
    tournament. At a given time, only one of the two 
    will contain data. If it is a league-style competition,
    it will have an empty cupConfiguration object 
    and vice-versa.
    """
    type SeasonConfiguration {
        """
        Property representing the configuration data
        for a league-style competition.
        """
        leagueConfiguration: LeagueConfiguration

        """
        Property representing the configuration data
        for a cup-style competition.
        """
        cupConfiguration: CupConfiguration
    }


    """
    This object represents the individual configuration
    settings for a league-style competition.
    """
    type LeagueConfiguration {
        """
        An integer value that defines the number of 
        divisions that should be present in a given season.
        """
        numberOfDivisions: Int!

        """
        An array of objects where every object will represent
        the number of fighters per division.
        """
        fightersPerDivision: [FightersPerDivision]

        """
        An integer value that represents the number of 
        points that a winner will receive in case of a win.
        """
        pointsPerWin: Int!
    }

    """
    This object represents a division and the number of
    fighters participating in that division
    """
    type FightersPerDivision {
        """
        A division's identification by its unique integer number.
        """
        divisionNumber: Int!

        """
        An integer value that represents the number of fighters 
        participating in a division.
        """
        numberOfFighters: Int!
    }

    """
    This object represents the configuration data for a 
    cup-style competition.
    """
    type CupConfiguration {
        """
        This property represents the number of 
        knockout rounds in a cup-style competition.
        """
        knockoutRounds: Int!

        """
        This property defins the number of fighters in a 
        cup-style competition
        """
        numberOfFighters: Int!

        """
        This property defines user-defined names for the various stages of a competition created as per the number of rounds, e.g., ['Preliminary', 'Semi-finals', 'Finals']
        """
        stages: [String!]
    }
`;

export default seasonConfigurationTypeDef;
