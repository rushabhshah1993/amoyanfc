import React from 'react';
import RobustGoogleDriveImage from './RobustGoogleDriveImage';

const CompetitionCard = ({ competition }) => {
  if (!competition) {
    return <div className="competition-card">No competition data</div>;
  }

  return (
    <div className="competition-card">
      <div className="competition-logo">
        <RobustGoogleDriveImage
          src={competition.logo}
          alt={`${competition.competitionName} logo`}
          fallback={
            <div className="logo-placeholder">
              <span>{competition.competitionName.charAt(0)}</span>
            </div>
          }
        />
      </div>
      <h3>{competition.competitionName}</h3>
    </div>
  );
};

export default CompetitionCard;
