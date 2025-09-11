import React from 'react';

const CompetitionCard = ({ competition }) => {
  return (
    <div className="competition-card">
      {competition.logo && (
        <div className="competition-logo">
          <img src={competition.logo} alt={`${competition.competitionName} logo`} />
        </div>
      )}
      <h3>{competition.competitionName}</h3>
      {competition.shortName && (
        <p><strong>Short Name:</strong> {competition.shortName}</p>
      )}
      <p><strong>Type:</strong> {competition.type}</p>
      {competition.description && (
        <p><strong>Description:</strong> {competition.description}</p>
      )}
    </div>
  );
};

export default CompetitionCard;
