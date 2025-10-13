const roundStandingsTypeDef = `#graphql
  """
  Represents an individual fighter's standing information at a specific point in the season
  """
  type FighterStanding {
    "The unique ID of the fighter"
    fighterId: ID!
    
    "Total number of fights the fighter has fought so far in the season"
    fightsCount: Int!
    
    "Total number of wins the fighter has achieved so far in the season"
    wins: Int!
    
    "Total points accumulated by the fighter (3 points per win)"
    points: Int!
    
    "Current rank of the fighter in the standings (considering tiebreakers)"
    rank: Int!
    
    "Total number of fighters in this division"
    totalFightersCount: Int!
  }

  """
  Represents the complete standings table at a specific point in time (after a fight)
  Contains cumulative season statistics for all fighters in a division
  """
  type RoundStandings {
    "Unique identifier for this standings document"
    id: ID!
    
    "Reference to the competition meta this standings belongs to"
    competitionId: ID!
    
    "Season number (e.g., 1 for Season 1)"
    seasonNumber: Int!
    
    "Division number within the season (e.g., 1 for Division 1)"
    divisionNumber: Int!
    
    "Round number this standings snapshot belongs to"
    roundNumber: Int!
    
    "Fight identifier string (e.g., 'IFC-S1-D1-R1-F1')"
    fightId: String!
    
    "Human-readable fight identifier (same as fightId)"
    fightIdentifier: String!
    
    "Array of fighter standings sorted by rank (with tiebreakers applied)"
    standings: [FighterStanding!]!
    
    "Timestamp when this document was created"
    createdAt: String!
    
    "Timestamp when this document was last updated"
    updatedAt: String!
  }

  extend type Query {
    """
    Get standings for a specific fight by its identifier
    Example: getRoundStandings(fightIdentifier: "IFC-S1-D1-R3-F2")
    """
    getRoundStandings(fightIdentifier: String!): RoundStandings
    
    """
    Get standings after the last fight of a specific round
    Returns cumulative season standings up to and including the last fight of the specified round
    Example: getRoundStandingsByRound(competitionId: "123", seasonNumber: 1, divisionNumber: 1, roundNumber: 3)
    """
    getRoundStandingsByRound(
      competitionId: ID!
      seasonNumber: Int!
      divisionNumber: Int!
      roundNumber: Int!
    ): RoundStandings
    
    """
    Get final season standings (standings after the last fight of the last round)
    Example: getFinalSeasonStandings(competitionId: "123", seasonNumber: 1, divisionNumber: 1)
    """
    getFinalSeasonStandings(
      competitionId: ID!
      seasonNumber: Int!
      divisionNumber: Int!
    ): RoundStandings
    
    """
    Get all standings documents for a season/division
    Returns standings after every fight across all rounds
    Example: getAllRoundsStandings(competitionId: "123", seasonNumber: 1, divisionNumber: 1)
    Returns: Array of 45 standings (for a 9-round season with 5 fights per round)
    """
    getAllRoundsStandings(
      competitionId: ID!
      seasonNumber: Int!
      divisionNumber: Int!
    ): [RoundStandings!]!
  }
`;

export default roundStandingsTypeDef;
