import React from 'react';
import RobustGoogleDriveImage from './RobustGoogleDriveImage';

const CompetitionCard = ({ competition, key }) => {
  return (
    <div className="competition-card" key={key}>
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
