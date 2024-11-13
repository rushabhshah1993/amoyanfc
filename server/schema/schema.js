import graphql from 'graphql';

const { 
    GraphQLObjectType, GraphQLString, GraphQLID,
    GraphQLList, GraphQLNonNull, GraphQLSchema
} = graphql;

import { CompetitionMeta } from "../models/competition-meta.model.js";

const CompetitionType = new GraphQLObjectType({
    name: 'CompetitionMeta',
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
                return CompetitionMeta.findById(args.id)
            }
        },
        competitions: {
            type: new GraphQLList(CompetitionType),
            resolve() { return CompetitionMeta.find({}) }
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
                let competition = new CompetitionMeta({
                    name: args.name,
                    description: args.description,
                    logo: args.logo
                })

                return competition.save();
            }
        }
    }
});

export default new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation
});