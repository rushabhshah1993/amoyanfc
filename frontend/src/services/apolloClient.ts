import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql',
  credentials: 'include', // Include cookies in requests
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

console.log('Apollo Client initialized with URI:', process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql');

export default client;
