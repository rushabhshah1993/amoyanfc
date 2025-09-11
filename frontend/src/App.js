import React from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './services/apolloClient';
import HomePage from './pages/HomePage';

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <HomePage />
      </div>
    </ApolloProvider>
  );
}

export default App;
