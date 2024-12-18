const seasonTypeDef = `#graphql
"""
    Represents information about an associated season for a competition
    """
    type SeasonMeta {
        """
        A unique ID representing a season
        """
        id: ID! 

        """
        Represents the unique season number for that competition, i.e. IFC Season 9
        """
        seasonNumber: Int!

        """
        Represents the start date of a competition
        """
        startDate: String

        """
        Represents the end date of a competition
        """
        endDate: String

        """
        Provides the granular level division data of the season, applicable only for the league-style competitions.
        It will consist of an array of objects where every object is an individual division of the league.
        """
        leagueDivisions: [LeagueDivision]

        """
        Provides the granular level data of the season, applicable only for the cup-style competitions
        """
        cupParticipants: CupParticipants
    }
    
    """
    Represents the granular level information about a particular division of a season
    """
    type LeagueDivsion {
        """
        Represents the unique division number of a particular season
        """
        divisionNumber: Int!

        """
        Provides a list of fighters fighting in a particular division of a given season
        """
        fighters: [Fighter]
    }

    """
    Represents the list of fighters for a particular cup competition irrespective of its linked season
    """
    type CupParticipants {
        fighters: [Fighter]
    }
`;

export default seasonTypeDef;
