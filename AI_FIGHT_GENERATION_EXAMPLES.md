# AI Fight Generation - Frontend Examples

This document provides ready-to-use code examples for integrating the AI Fight Generation feature in your React frontend.

## GraphQL Mutations

### 1. Define the Mutations in Your Queries File

Add these to your `frontend/src/services/queries.ts`:

```typescript
import { gql } from '@apollo/client';

// Simulate Fight Mutation (AI chooses winner)
export const SIMULATE_FIGHT = gql`
  mutation SimulateFight($input: SimulateFightInput!) {
    simulateFight(input: $input) {
      success
      message
      fight {
        _id
        fighter1 {
          id
          firstName
          lastName
          profileImage
        }
        fighter2 {
          id
          firstName
          lastName
          profileImage
        }
        winner {
          id
          firstName
          lastName
        }
        fightIdentifier
        date
        genAIDescription
        isSimulated
        fighterStats {
          fighterId
          stats {
            fightTime
            finishingMove
            grappling {
              accuracy
              defence
            }
            significantStrikes {
              accuracy
              attempted
              landed
              defence
              landedPerMinute
              positions {
                clinching
                ground
                standing
              }
            }
            strikeMap {
              head {
                strike
                absorb
              }
              torso {
                strike
                absorb
              }
              leg {
                strike
                absorb
              }
            }
            submissions {
              attemptsPer15Mins
              average
            }
            takedowns {
              accuracy
              attempted
              landed
              defence
              avgTakedownsLandedPerMin
            }
          }
        }
        fightStatus
      }
      competition {
        id
      }
    }
  }
`;

// Generate Fight with Winner Mutation (User selects winner)
export const GENERATE_FIGHT_WITH_WINNER = gql`
  mutation GenerateFightWithWinner($input: GenerateFightWithWinnerInput!) {
    generateFightWithWinner(input: $input) {
      success
      message
      fight {
        _id
        fighter1 {
          id
          firstName
          lastName
          profileImage
        }
        fighter2 {
          id
          firstName
          lastName
          profileImage
        }
        winner {
          id
          firstName
          lastName
        }
        fightIdentifier
        date
        userDescription
        genAIDescription
        isSimulated
        fighterStats {
          fighterId
          stats {
            fightTime
            finishingMove
            grappling {
              accuracy
              defence
            }
            significantStrikes {
              accuracy
              attempted
              landed
              defence
              landedPerMinute
              positions {
                clinching
                ground
                standing
              }
            }
            strikeMap {
              head {
                strike
                absorb
              }
              torso {
                strike
                absorb
              }
              leg {
                strike
                absorb
              }
            }
            submissions {
              attemptsPer15Mins
              average
            }
            takedowns {
              accuracy
              attempted
              landed
              defence
              avgTakedownsLandedPerMin
            }
          }
        }
        fightStatus
      }
      competition {
        id
      }
    }
  }
`;
```

## React Component Examples

### Example 1: Fight Simulation Component

```typescript
import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { SIMULATE_FIGHT } from '../services/queries';

interface SimulateFightProps {
  competitionId: string;
  seasonNumber: number;
  divisionNumber: number;
  roundNumber: number;
  fightIndex: number;
  fighter1Id: string;
  fighter2Id: string;
  onComplete?: () => void;
}

const SimulateFightButton: React.FC<SimulateFightProps> = ({
  competitionId,
  seasonNumber,
  divisionNumber,
  roundNumber,
  fightIndex,
  fighter1Id,
  fighter2Id,
  onComplete
}) => {
  const [simulateFight, { loading, error, data }] = useMutation(SIMULATE_FIGHT);
  const [showResult, setShowResult] = useState(false);

  const handleSimulate = async () => {
    try {
      const result = await simulateFight({
        variables: {
          input: {
            competitionId,
            seasonNumber,
            divisionNumber,
            roundNumber,
            fightIndex,
            fighter1Id,
            fighter2Id,
            fightDate: new Date().toISOString()
          }
        }
      });

      if (result.data?.simulateFight?.success) {
        setShowResult(true);
        onComplete?.();
      }
    } catch (err) {
      console.error('Error simulating fight:', err);
    }
  };

  return (
    <div className="simulate-fight-container">
      <button 
        onClick={handleSimulate}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Simulating Fight...' : 'Simulate Fight'}
      </button>

      {error && (
        <div className="alert alert-error">
          Error: {error.message}
        </div>
      )}

      {showResult && data?.simulateFight?.fight && (
        <div className="fight-result">
          <h3>Fight Complete!</h3>
          <div className="winner">
            <strong>Winner:</strong> {data.simulateFight.fight.winner.firstName} {data.simulateFight.fight.winner.lastName}
          </div>
          <div className="description">
            <h4>Fight Description:</h4>
            <p>{data.simulateFight.fight.genAIDescription}</p>
          </div>
          <div className="stats">
            <h4>Fight Statistics:</h4>
            {data.simulateFight.fight.fighterStats.map((stats: any) => (
              <div key={stats.fighterId} className="fighter-stats">
                <h5>Fighter {stats.fighterId}</h5>
                <ul>
                  <li>Fight Time: {stats.stats.fightTime} minutes</li>
                  <li>Finishing Move: {stats.stats.finishingMove || 'N/A'}</li>
                  <li>Strikes Landed: {stats.stats.significantStrikes.landed}</li>
                  <li>Strike Accuracy: {stats.stats.significantStrikes.accuracy}%</li>
                  <li>Takedowns: {stats.stats.takedowns.landed}/{stats.stats.takedowns.attempted}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulateFightButton;
```

### Example 2: User-Selected Winner Component

```typescript
import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { GENERATE_FIGHT_WITH_WINNER } from '../services/queries';

interface GenerateFightWithWinnerProps {
  competitionId: string;
  seasonNumber: number;
  divisionNumber: number;
  roundNumber: number;
  fightIndex: number;
  fighter1Id: string;
  fighter2Id: string;
  fighter1Name: string;
  fighter2Name: string;
  onComplete?: () => void;
}

const GenerateFightWithWinner: React.FC<GenerateFightWithWinnerProps> = ({
  competitionId,
  seasonNumber,
  divisionNumber,
  roundNumber,
  fightIndex,
  fighter1Id,
  fighter2Id,
  fighter1Name,
  fighter2Name,
  onComplete
}) => {
  const [generateFight, { loading, error, data }] = useMutation(GENERATE_FIGHT_WITH_WINNER);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [userDescription, setUserDescription] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const handleGenerate = async () => {
    if (!selectedWinner) {
      alert('Please select a winner');
      return;
    }

    try {
      const result = await generateFight({
        variables: {
          input: {
            competitionId,
            seasonNumber,
            divisionNumber,
            roundNumber,
            fightIndex,
            fighter1Id,
            fighter2Id,
            winnerId: selectedWinner,
            userDescription: userDescription || undefined,
            fightDate: new Date().toISOString()
          }
        }
      });

      if (result.data?.generateFightWithWinner?.success) {
        setShowResult(true);
        onComplete?.();
      }
    } catch (err) {
      console.error('Error generating fight:', err);
    }
  };

  return (
    <div className="generate-fight-container">
      <h3>Generate Fight Result</h3>
      
      <div className="winner-selection">
        <h4>Select Winner:</h4>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value={fighter1Id}
              checked={selectedWinner === fighter1Id}
              onChange={(e) => setSelectedWinner(e.target.value)}
            />
            {fighter1Name}
          </label>
          <label>
            <input
              type="radio"
              value={fighter2Id}
              checked={selectedWinner === fighter2Id}
              onChange={(e) => setSelectedWinner(e.target.value)}
            />
            {fighter2Name}
          </label>
        </div>
      </div>

      <div className="description-input">
        <h4>Fight Description (Optional):</h4>
        <textarea
          value={userDescription}
          onChange={(e) => setUserDescription(e.target.value)}
          placeholder="Describe how the fight went... (e.g., 'Fighter 1 dominated with striking and landed a knockout roundhouse kick in the final moments')"
          rows={5}
          className="form-control"
        />
        <small>Leave empty for AI to generate the entire description</small>
      </div>

      <button 
        onClick={handleGenerate}
        disabled={loading || !selectedWinner}
        className="btn btn-primary"
      >
        {loading ? 'Generating Fight...' : 'Generate Fight Result'}
      </button>

      {error && (
        <div className="alert alert-error">
          Error: {error.message}
        </div>
      )}

      {showResult && data?.generateFightWithWinner?.fight && (
        <div className="fight-result">
          <h3>Fight Generated!</h3>
          <div className="winner">
            <strong>Winner:</strong> {data.generateFightWithWinner.fight.winner.firstName} {data.generateFightWithWinner.fight.winner.lastName}
          </div>
          
          {data.generateFightWithWinner.fight.userDescription && (
            <div className="user-description">
              <h4>Your Description:</h4>
              <p>{data.generateFightWithWinner.fight.userDescription}</p>
            </div>
          )}
          
          <div className="ai-description">
            <h4>AI Expanded Description:</h4>
            <p>{data.generateFightWithWinner.fight.genAIDescription}</p>
          </div>
          
          <div className="stats">
            <h4>Fight Statistics:</h4>
            {data.generateFightWithWinner.fight.fighterStats.map((stats: any) => (
              <div key={stats.fighterId} className="fighter-stats">
                <h5>Fighter {stats.fighterId}</h5>
                <ul>
                  <li>Fight Time: {stats.stats.fightTime} minutes</li>
                  <li>Finishing Move: {stats.stats.finishingMove || 'N/A'}</li>
                  <li>Strikes Landed: {stats.stats.significantStrikes.landed}</li>
                  <li>Strike Accuracy: {stats.stats.significantStrikes.accuracy}%</li>
                  <li>Takedowns: {stats.stats.takedowns.landed}/{stats.stats.takedowns.attempted}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateFightWithWinner;
```

### Example 3: Combined Component with Modal

```typescript
import React, { useState } from 'react';
import SimulateFightButton from './SimulateFightButton';
import GenerateFightWithWinner from './GenerateFightWithWinner';

interface FightGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
  seasonNumber: number;
  divisionNumber: number;
  roundNumber: number;
  fightIndex: number;
  fighter1: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string;
  };
  fighter2: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string;
  };
  onFightComplete?: () => void;
}

const FightGenerationModal: React.FC<FightGenerationModalProps> = ({
  isOpen,
  onClose,
  competitionId,
  seasonNumber,
  divisionNumber,
  roundNumber,
  fightIndex,
  fighter1,
  fighter2,
  onFightComplete
}) => {
  const [mode, setMode] = useState<'simulate' | 'select'>('simulate');

  if (!isOpen) return null;

  const handleComplete = () => {
    onFightComplete?.();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>Generate Fight Result</h2>
        
        <div className="fighters-preview">
          <div className="fighter">
            <img src={fighter1.profileImage} alt={`${fighter1.firstName} ${fighter1.lastName}`} />
            <h3>{fighter1.firstName} {fighter1.lastName}</h3>
          </div>
          <div className="vs">VS</div>
          <div className="fighter">
            <img src={fighter2.profileImage} alt={`${fighter2.firstName} ${fighter2.lastName}`} />
            <h3>{fighter2.firstName} {fighter2.lastName}</h3>
          </div>
        </div>

        <div className="mode-selector">
          <button 
            className={mode === 'simulate' ? 'active' : ''}
            onClick={() => setMode('simulate')}
          >
            AI Simulate Fight
          </button>
          <button 
            className={mode === 'select' ? 'active' : ''}
            onClick={() => setMode('select')}
          >
            Choose Winner
          </button>
        </div>

        {mode === 'simulate' ? (
          <SimulateFightButton
            competitionId={competitionId}
            seasonNumber={seasonNumber}
            divisionNumber={divisionNumber}
            roundNumber={roundNumber}
            fightIndex={fightIndex}
            fighter1Id={fighter1.id}
            fighter2Id={fighter2.id}
            onComplete={handleComplete}
          />
        ) : (
          <GenerateFightWithWinner
            competitionId={competitionId}
            seasonNumber={seasonNumber}
            divisionNumber={divisionNumber}
            roundNumber={roundNumber}
            fightIndex={fightIndex}
            fighter1Id={fighter1.id}
            fighter2Id={fighter2.id}
            fighter1Name={`${fighter1.firstName} ${fighter1.lastName}`}
            fighter2Name={`${fighter2.firstName} ${fighter2.lastName}`}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
};

export default FightGenerationModal;
```

## CSS Styling Example

```css
/* FightGeneration.css */

.simulate-fight-container,
.generate-fight-container {
  padding: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.alert {
  padding: 15px;
  margin: 15px 0;
  border-radius: 5px;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.fight-result {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 10px;
}

.fight-result .winner {
  font-size: 20px;
  margin-bottom: 15px;
  color: #28a745;
}

.fight-result .description,
.fight-result .user-description,
.fight-result .ai-description {
  margin-bottom: 20px;
}

.fight-result h4 {
  margin-bottom: 10px;
  color: #333;
}

.fight-result p {
  line-height: 1.6;
  color: #555;
}

.fighter-stats {
  margin-bottom: 15px;
  padding: 15px;
  background-color: white;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.fighter-stats h5 {
  margin-bottom: 10px;
  color: #007bff;
}

.fighter-stats ul {
  list-style: none;
  padding: 0;
}

.fighter-stats li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.winner-selection {
  margin-bottom: 20px;
}

.radio-group {
  display: flex;
  gap: 20px;
  margin-top: 10px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.description-input {
  margin-bottom: 20px;
}

.description-input textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-family: inherit;
  resize: vertical;
}

.description-input small {
  display: block;
  margin-top: 5px;
  color: #6c757d;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
  color: #999;
}

.modal-close:hover {
  color: #333;
}

.fighters-preview {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 20px 0;
}

.fighters-preview .fighter {
  text-align: center;
}

.fighters-preview .fighter img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
}

.fighters-preview .vs {
  font-size: 24px;
  font-weight: bold;
  color: #dc3545;
}

.mode-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-selector button {
  flex: 1;
  padding: 10px;
  border: 2px solid #007bff;
  background-color: white;
  color: #007bff;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-selector button.active {
  background-color: #007bff;
  color: white;
}

.mode-selector button:hover:not(.active) {
  background-color: #e7f3ff;
}
```

## Usage in Your Application

1. **Import the component** where you want to use it (e.g., in a Season/Round view):

```typescript
import FightGenerationModal from './components/FightGenerationModal';
```

2. **Add state to manage the modal**:

```typescript
const [showFightModal, setShowFightModal] = useState(false);
const [selectedFight, setSelectedFight] = useState<any>(null);
```

3. **Trigger the modal** when viewing a scheduled fight:

```typescript
const handleGenerateFight = (fight) => {
  setSelectedFight(fight);
  setShowFightModal(true);
};
```

4. **Render the modal**:

```typescript
{showFightModal && selectedFight && (
  <FightGenerationModal
    isOpen={showFightModal}
    onClose={() => setShowFightModal(false)}
    competitionId={competition.id}
    seasonNumber={season.number}
    divisionNumber={division.number}
    roundNumber={round.number}
    fightIndex={selectedFight.index}
    fighter1={selectedFight.fighter1}
    fighter2={selectedFight.fighter2}
    onFightComplete={() => {
      // Refetch competition data or update UI
      refetchCompetition();
    }}
  />
)}
```

## Testing

To test the integration:

1. Make sure your server is running with the OpenAI API key configured
2. Navigate to a competition with scheduled fights
3. Click on a fight that has status 'pending'
4. Try both "Simulate Fight" and "Choose Winner" modes
5. Verify that the generated description and statistics appear correctly

## Next Steps

- Add loading animations for better UX
- Implement error retry logic
- Add fight result sharing functionality
- Create a fight history view showing all AI-generated fights
- Add the ability to regenerate fight descriptions if unsatisfied

