export const competitionMetaSchema = `#graphql
    type CompetitionMeta {
        id: ID!
        competitionName: String!
        type: String!
        description: String
        logo: String!
    }

    type Query {
        getCompetition(id: ID!): CompetitionMeta
        getAllCompetitions: [CompetitionMeta]
    }

    type Mutation {
        addCompetition(competitionName: String!, type: String!, description: String, logo: String!): CompetitionMeta
        editCompetition(id: ID!, competitionName: String, type: String, description: String, logo: String ): CompetitionMeta
    }
`
