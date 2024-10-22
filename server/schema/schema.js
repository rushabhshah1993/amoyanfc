const graphql = require('graphql');
const { 
    GraphQLObjectType, GraphQLString, GraphQLID,
    GraphQLList, GraphQLNonNull, GraphQLSchema
} = graphql;

const Competition = require('./../models/competition');

const CompetitionType = new GraphQLObjectType({
    name: 'Competition',
    fields: () => ({
        id: {type: GraphQLID},
        name: {type: GraphQLString},
        description: {type: GraphQLString},
        logo: {type: GraphQLString}
    })
});

const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        competition: {
            type: CompetitionType,
            args: {
                id: { type: GraphQLID }
            },
            resolve(parent, args) {
                return Competition.findById(args.id)
            }
        },
        competitions: {
            type: new GraphQLList(CompetitionType),
            resolve() { return Competition.find({}) }
        }
    }
});

const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addCompetition: {
            type: CompetitionType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString)},
                description: { type: new GraphQLNonNull(GraphQLString)},
                logo: { type: new GraphQLNonNull(GraphQLString)},
            },
            resolve(parents, args) {
                let competition = new Competition({
                    name: args.name,
                    description: args.description,
                    logo: args.logo
                })

                return competition.save();
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation
});