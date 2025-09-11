import React from 'react';
import RobustGoogleDriveImage from './RobustGoogleDriveImage';

const CompetitionCard = ({ competition }) => {
  return (
    <div className="competition-card">
      {competition.logo && (
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
