import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import client from './services/apolloClient';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import { RootState } from './store';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import HomePage from './pages/HomePage/HomePage';

const AppContent: React.FC = () => {
  const { isDarkMode } = useAppSelector((state: RootState) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  return (
    <div className="App">
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ApolloProvider client={client}>
        <AppContent />
      </ApolloProvider>
    </Provider>
  );
};

export default App;
