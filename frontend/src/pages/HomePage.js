import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_COMPETITIONS } from '../services/queries';
import CompetitionCard from '../components/CompetitionCard';

const HomePage = () => {
  const { loading, error, data } = useQuery(GET_COMPETITIONS);

  if (loading) return <div className="loading">Loading competitions...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const competitions = data?.getAllCompetitionsMeta || [];

  return (
    <div className="home-page">
      <div className="header">
        <h1>Amoyan Fighting Championship</h1>
        <p>Brutal combat sports competition</p>
      </div>
      
      <div className="competitions-section">
        {competitions.length === 0 ? (
          <div className="loading">No competitions found.</div>
        ) : (
          <div className="competition-grid">
            {competitions.map((competition, index) => (
              <CompetitionCard 
                key={competition._id || `competition-${index}`} 
                competition={competition} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
