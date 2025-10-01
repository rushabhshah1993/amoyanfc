import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import client from './services/apolloClient';
import { store } from './store';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import HomePage from './pages/HomePage/HomePage';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ApolloProvider client={client}>
        <div className="App">
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        </div>
      </ApolloProvider>
    </Provider>
  );
};

export default App;
