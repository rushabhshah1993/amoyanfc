/* Input imports */
import roundStandingsInput from "../inputs/round-standings.input.js";
import roundStandingsTypes from "../types/round-standings.types.js";

const roundStandingsTypeDef = `#graphql
    """
    Detailed information about the change in the standings
    after every fight
    """
    type RoundStandings {
        """
        Unique ID representing an entry in the standings
        """
        id: ID!

        """
        Unique ID reference of the competition it is mapped to
        """
        competitionId: ID!

        """
        Numeric representation of the season when the change occurs
        """
        seasonNumber: Int!

        """
        Numeric representation of the division when the change occurs
        """
        divisionNumber: Int!

        """
        Numeric representation of the round when the change occurs
        """
        roundNumber: Int!

        """
        Unique ID of the fight which caused the change
        """
        fightId: ID!

        """
        List of standings of the fighters on the application of the change
        """
        standings: [IndividualRoundStandingData!]

        """
        Representation of the fight reference
        """
        fight: Fight

        """
        Representation of the competition meta reference
        """
        competitionMeta: CompetitionMeta

        """
        Representation of the competition reference
        """
        competition: Competition
    }

    """
    Root query
    """
    type Query {
        """
        Get the round standings by their unique ID
        """
        getRoundStandingsById(id: ID!): RoundStandings

        """
        Get the round standings on the basis of season, division, round combination
        """
        getRoundStandingsByArgs(args: RoundFilterInput!): RoundStandings
    }

    """
    Root mutation
    """
    type Mutation {
        """
        Add new standings object
        """
        addNewRoundStandings(input: RoundStandingInput!): RoundStandings

        """
        Update an exisiting standings object
        """
        updateRoundStandings(id: ID!, input: RoundStandingInput!): RoundStandings

        """
        Delete an existing standings object
        """
        deleteRoundStandings(id: ID!): String
    }

    ${roundStandingsInput}
    ${roundStandingsTypes}
`;

export default roundStandingsTypeDef;
