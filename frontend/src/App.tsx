import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import client from './services/apolloClient';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import { RootState } from './store';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import FightersPage from './pages/FightersPage/FightersPage';
import FightersSortingPage from './pages/FightersSortingPage/FightersSortingPage';
import FighterPage from './pages/FighterPage/FighterPage';
import VersusPage from './pages/VersusPage/VersusPage';
import CompetitionPage from './pages/CompetitionPage/CompetitionPage';
import LeagueSeasonPage from './pages/LeagueSeasonPage/LeagueSeasonPage';
import DivisionPage from './pages/DivisionPage/DivisionPage';
import FightPage from './pages/FightPage/FightPage';

const AppContent: React.FC = () => {
  const { isDarkMode } = useAppSelector((state: RootState) => state.theme);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  // Determine current page based on the URL path
  const getCurrentPage = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname.startsWith('/fighters') || location.pathname.startsWith('/fighter')) return 'fighters';
    return 'home';
  };

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      navigate('/');
    } else if (page === 'fighters') {
      navigate('/fighters');
    }
  };

  return (
    <div className="App">
      <Header 
        title="Amoyan Fighting Championship"
        showNavigation={true}
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/fighters" element={<FightersPage />} />
        <Route path="/fighters/sort" element={<FightersSortingPage />} />
        <Route path="/fighter/:id" element={<FighterPage />} />
        <Route path="/versus" element={<VersusPage />} />
        <Route path="/versus/:fighter1Id" element={<VersusPage />} />
        <Route path="/versus/:fighter1Id/:fighter2Id" element={<VersusPage />} />
        <Route path="/competition/:id" element={<CompetitionPage />} />
        <Route path="/competition/:competitionId/season/:seasonId" element={<LeagueSeasonPage />} />
        <Route path="/competition/:competitionId/season/:seasonId/division/:divisionNumber" element={<DivisionPage />} />
        <Route path="/fight/:fightId" element={<FightPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ApolloProvider client={client}>
        <ProtectedRoute>
          <Router>
            <AppContent />
          </Router>
        </ProtectedRoute>
      </ApolloProvider>
    </Provider>
  );
};

export default App;
