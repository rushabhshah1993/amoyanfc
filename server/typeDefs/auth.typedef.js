export const authTypeDef = `
    type User {
        googleId: String!
        email: String!
        name: String!
        picture: String
    }

    type AuthResponse {
        success: Boolean!
        message: String
    }

    type Query {
        me: User
        isAuthenticated: Boolean!
    }

    type Mutation {
        logout: AuthResponse!
    }
`;

