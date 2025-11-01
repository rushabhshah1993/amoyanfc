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
import CompetitionsPage from './pages/CompetitionsPage/CompetitionsPage';
import FightersPage from './pages/FightersPage/FightersPage';
import FightersSortingPage from './pages/FightersSortingPage/FightersSortingPage';
import FighterPage from './pages/FighterPage/FighterPage';
import GlobalRankingsPage from './pages/GlobalRankingsPage/GlobalRankingsPage';
import VersusPage from './pages/VersusPage/VersusPage';
import CompetitionPage from './pages/CompetitionPage/CompetitionPage';
import SeasonPageWrapper from './pages/SeasonPageWrapper';
import DetailedTimelinePage from './pages/DetailedTimelinePage/DetailedTimelinePage';
import DivisionPage from './pages/DivisionPage/DivisionPage';
import RoundsPage from './pages/RoundsPage/RoundsPage';
import FightPage from './pages/FightPage/FightPage';
import ArticlesPage from './pages/ArticlesPage/ArticlesPage';
import ArticleDetailPage from './pages/ArticleDetailPage/ArticleDetailPage';
import CreateArticlePage from './pages/CreateArticlePage/CreateArticlePage';
import CreateFighterPage from './pages/CreateFighterPage/CreateFighterPage';
import CreateSeasonPage from './pages/CreateSeasonPage/CreateSeasonPage';

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
    if (location.pathname.startsWith('/competitions') || location.pathname.startsWith('/competition')) return 'competitions';
    if (location.pathname.startsWith('/fighters') || location.pathname.startsWith('/fighter')) return 'fighters';
    if (location.pathname.startsWith('/articles') || location.pathname.startsWith('/article')) return 'articles';
    return 'home';
  };

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      navigate('/');
    } else if (page === 'competitions') {
      navigate('/competitions');
    } else if (page === 'fighters') {
      navigate('/fighters');
    } else if (page === 'articles') {
      navigate('/articles');
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
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/competitions/create-season" element={<CreateSeasonPage />} />
        <Route path="/fighters" element={<FightersPage />} />
        <Route path="/fighters/create" element={<CreateFighterPage />} />
        <Route path="/fighters/sort" element={<FightersSortingPage />} />
        <Route path="/fighter/:id" element={<FighterPage />} />
        <Route path="/global-rankings" element={<GlobalRankingsPage />} />
        <Route path="/versus" element={<VersusPage />} />
        <Route path="/versus/:fighter1Id" element={<VersusPage />} />
        <Route path="/versus/:fighter1Id/:fighter2Id" element={<VersusPage />} />
        <Route path="/competition/:id" element={<CompetitionPage />} />
        <Route path="/competition/:competitionId/season/:seasonId" element={<SeasonPageWrapper />} />
        <Route path="/competition/:competitionId/season/:seasonId/timeline" element={<DetailedTimelinePage />} />
        <Route path="/competition/:competitionId/season/:seasonId/division/:divisionNumber" element={<DivisionPage />} />
        <Route path="/competition/:competitionId/season/:seasonId/division/:divisionNumber/rounds" element={<RoundsPage />} />
        <Route path="/fight/:fightId" element={<FightPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/create" element={<CreateArticlePage />} />
        <Route path="/articles/:id" element={<ArticleDetailPage />} />
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
