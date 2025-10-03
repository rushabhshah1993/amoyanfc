import React, { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import client from './services/apolloClient';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import { RootState } from './store';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import FightersPage from './pages/FightersPage/FightersPage';
import FighterPage from './pages/FighterPage/FighterPage';

const AppContent: React.FC = () => {
  const { isDarkMode } = useAppSelector((state: RootState) => state.theme);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Navigation will be handled by React Router
    if (page === 'home') {
      window.location.href = '/';
    } else if (page === 'fighters') {
      window.location.href = '/fighters';
    }
  };

  return (
    <div className="App">
      <ProtectedRoute>
        <Router>
          <Header 
            title="Amoyan Fighting Championship"
            showNavigation={true}
            currentPage={currentPage}
            onNavigate={handleNavigate}
          />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/fighters" element={<FightersPage />} />
            <Route path="/fighter/:id" element={<FighterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
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
