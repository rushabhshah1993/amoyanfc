const competitionMetaSchema = `#graphql
    """
    Represents a competition in the system
    """
    type CompetitionMeta {
        """
        Represents the unique ID of the competition
        """
        id: ID! 

        """
        Represents the unique name of the competition
        """
        competitionName: String!

        """
        An indicator to determine whether the competition is of a league-style tournament or a cup-style tournament
        """
        type: String!

        """
        A detailed description of the tournament
        """
        description: String

        """
        Represents the URL for the competition's logo
        """
        logo: String!
    }

    """
    Query root for fetching data.
    """
    type Query {
        """
        Query to fetch an individual competition's data
        """
        getCompetition(id: ID!): CompetitionMeta

        """
        Query to fetch the entire list of competitions and their respective data
        """
        getAllCompetitions: [CompetitionMeta]
    }

    """
    Root mutation type for modifying data.
    """
    type Mutation {
        """
        Adds a new competition to the system
        """
        addCompetition(input: NewCompetitionInput!): CompetitionMeta!

        """
        Updates an existing competition's data
        """
        editCompetition(id: ID!, input: ExistingCompetitionInput!): CompetitionMeta!
    }

    """
    Input type for creating a new competition
    """
    input NewCompetitionInput {
        """
        The competition's name.
        """
        competitionName: String!

        """
        The competition's type - league or cup.
        """
        type: String!

        """
        The competition's description. This is optional.
        """
        description: String,

        """
        A URL string specifying the location of the competition's logo.
        """
        logo: String!
    }

    """
    Input type for editing an exisiting competition in the system.
    """
    input ExistingCompetitionInput {
        """
        The unique ID denoting a competition.
        """
        id: ID!

        """
        The updated name of the competition. Optional for update.
        """
        competitionName: String

        """
        The updated type of the competition. Optional for update.
        """
        type: String

        """
        The updated description of the competition. Optional for update.
        """
        description: String

        """
        The updated URL pointing to the competition's logo. Optional for update.
        """
        logo: String
    }
`;


export default competitionMetaSchema;