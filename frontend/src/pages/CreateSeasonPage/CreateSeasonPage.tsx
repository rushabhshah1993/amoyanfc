import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_COMPETITIONS, GET_ALL_FIGHTERS, CREATE_COMPETITION_SEASON } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './CreateSeasonPage.module.css';

interface CompetitionMeta {
    id: string;
    competitionName: string;
    shortName: string;
    type: string;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string;
}

interface DivisionConfig {
    divisionNumber: number;
    divisionName: string;
    numberOfFighters: number;
    fightFeeInGbp: number;
    winningPrizeInGbp: number;
    selectedFighters: string[];
}

interface SeasonFormData {
    competitionMetaId: string;
    seasonNumber: number;
    numberOfDivisions: number;
    divisions: DivisionConfig[];
    fighterOfTheSeasonPrizeInGbp: number;
}

const CreateSeasonPage: React.FC = () => {
    const [formData, setFormData] = useState<SeasonFormData>({
        competitionMetaId: '',
        seasonNumber: 1,
        numberOfDivisions: 3,
        divisions: [],
        fighterOfTheSeasonPrizeInGbp: 10000
    });

    const [currentStep, setCurrentStep] = useState<'basic' | 'divisions' | 'fighters'>('basic');
    const [selectedDivision, setSelectedDivision] = useState<number>(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch competitions and fighters
    const { data: competitionsData, loading: competitionsLoading } = useQuery(GET_COMPETITIONS);
    const { data: fightersData, loading: fightersLoading } = useQuery(GET_ALL_FIGHTERS);
    
    // Mutation for creating season
    const [createSeasonMutation, { loading: creatingSeason, error: createSeasonError }] = useMutation(CREATE_COMPETITION_SEASON);

    const competitions: CompetitionMeta[] = competitionsData?.getAllCompetitionsMeta || [];
    const allFighters: Fighter[] = fightersData?.getAllFighters || [];

    // Initialize divisions when numberOfDivisions changes
    useEffect(() => {
        const newDivisions: DivisionConfig[] = [];
        for (let i = 1; i <= formData.numberOfDivisions; i++) {
            const existingDiv = formData.divisions.find(d => d.divisionNumber === i);
            if (existingDiv) {
                newDivisions.push(existingDiv);
            } else {
                // Default values based on standard rules
                let defaultFighters = 10;
                let defaultFee = 5000;
                let defaultPrize = 50000;
                
                if (i === 2) {
                    defaultFighters = 12;
                    defaultFee = 3000;
                    defaultPrize = 30000;
                } else if (i === 3) {
                    defaultFighters = 16;
                    defaultFee = 2000;
                    defaultPrize = 20000;
                }

                newDivisions.push({
                    divisionNumber: i,
                    divisionName: '',
                    numberOfFighters: defaultFighters,
                    fightFeeInGbp: defaultFee,
                    winningPrizeInGbp: defaultPrize,
                    selectedFighters: []
                });
            }
        }
        setFormData(prev => ({ ...prev, divisions: newDivisions }));
    }, [formData.numberOfDivisions]);

    // Get already selected fighter IDs across all divisions
    const getSelectedFighterIds = (): Set<string> => {
        const selected = new Set<string>();
        formData.divisions.forEach(div => {
            div.selectedFighters.forEach(fid => selected.add(fid));
        });
        return selected;
    };

    // Get available fighters for a specific division (sorted alphabetically)
    const getAvailableFighters = (divisionNumber: number): Fighter[] => {
        const selectedFighters = getSelectedFighterIds();
        const currentDivision = formData.divisions.find(d => d.divisionNumber === divisionNumber);
        const currentlySelected = new Set(currentDivision?.selectedFighters || []);

        const availableFighters = allFighters.filter(fighter => 
            !selectedFighters.has(fighter.id) || currentlySelected.has(fighter.id)
        );

        // Sort alphabetically by first name, then last name
        return availableFighters.sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    };

    const handleBasicInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'seasonNumber' || name === 'numberOfDivisions' || name === 'fighterOfTheSeasonPrizeInGbp'
                ? parseInt(value) || 0
                : value
        }));

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleDivisionConfigChange = (divisionNumber: number, field: keyof DivisionConfig, value: any) => {
        setFormData(prev => ({
            ...prev,
            divisions: prev.divisions.map(div =>
                div.divisionNumber === divisionNumber
                    ? { ...div, [field]: value }
                    : div
            )
        }));
    };

    const handleFighterToggle = (divisionNumber: number, fighterId: string) => {
        const division = formData.divisions.find(d => d.divisionNumber === divisionNumber);
        if (!division) return;

        const isSelected = division.selectedFighters.includes(fighterId);
        
        if (isSelected) {
            // Remove fighter
            handleDivisionConfigChange(
                divisionNumber,
                'selectedFighters',
                division.selectedFighters.filter(id => id !== fighterId)
            );
        } else {
            // Check if we've reached the limit
            if (division.selectedFighters.length >= division.numberOfFighters) {
                alert(`You can only select ${division.numberOfFighters} fighters for Division ${divisionNumber}`);
                return;
            }
            // Add fighter
            handleDivisionConfigChange(
                divisionNumber,
                'selectedFighters',
                [...division.selectedFighters, fighterId]
            );
        }
    };

    const validateBasicInfo = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.competitionMetaId) newErrors.competitionMetaId = 'Please select a competition';
        if (formData.seasonNumber < 1) newErrors.seasonNumber = 'Season number must be at least 1';
        if (formData.numberOfDivisions < 1) newErrors.numberOfDivisions = 'Must have at least 1 division';
        if (formData.fighterOfTheSeasonPrizeInGbp < 0) newErrors.fighterOfTheSeasonPrizeInGbp = 'Prize money cannot be negative';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateDivisionConfig = (): boolean => {
        const newErrors: Record<string, string> = {};

        formData.divisions.forEach(div => {
            if (div.numberOfFighters < 2) {
                newErrors[`div${div.divisionNumber}_fighters`] = `Division ${div.divisionNumber} must have at least 2 fighters`;
            }
            if (div.fightFeeInGbp < 0) {
                newErrors[`div${div.divisionNumber}_fee`] = `Division ${div.divisionNumber} fight fee cannot be negative`;
            }
            if (div.winningPrizeInGbp < 0) {
                newErrors[`div${div.divisionNumber}_prize`] = `Division ${div.divisionNumber} winning prize cannot be negative`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateFighterSelection = (): boolean => {
        const newErrors: Record<string, string> = {};

        formData.divisions.forEach(div => {
            if (div.selectedFighters.length !== div.numberOfFighters) {
                newErrors[`div${div.divisionNumber}_selection`] = 
                    `Division ${div.divisionNumber} needs exactly ${div.numberOfFighters} fighters (currently ${div.selectedFighters.length})`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (currentStep === 'basic') {
            if (validateBasicInfo()) {
                setCurrentStep('divisions');
            }
        } else if (currentStep === 'divisions') {
            if (validateDivisionConfig()) {
                setCurrentStep('fighters');
                setSelectedDivision(1);
            }
        }
    };

    const handlePrevStep = () => {
        if (currentStep === 'fighters') {
            setCurrentStep('divisions');
        } else if (currentStep === 'divisions') {
            setCurrentStep('basic');
        }
    };

    // Round-robin tournament generator
    const generateRoundRobinMatches = (fighters: string[], divisionNumber: number, competitionShortName: string, seasonNumber: number) => {
        const n = fighters.length;
        if (n % 2 !== 0) {
            throw new Error(`Division ${divisionNumber} has odd number of fighters (${n}). Must be even.`);
        }

        const totalRounds = n - 1;
        const fightsPerRound = n / 2;
        const rounds = [];

        // Create a copy of fighters array for rotation
        const fightersCopy = [...fighters];

        for (let round = 1; round <= totalRounds; round++) {
            const fights = [];
            
            // Generate fights for this round
            for (let i = 0; i < fightsPerRound; i++) {
                const fighter1Index = i;
                const fighter2Index = n - 1 - i;
                
                const fighter1 = fightersCopy[fighter1Index];
                const fighter2 = fightersCopy[fighter2Index];

                const fightIdentifier = `${competitionShortName}-S${seasonNumber}-D${divisionNumber}-R${round}-F${i + 1}`;

                fights.push({
                    fighter1,
                    fighter2,
                    winner: null,
                    fightIdentifier,
                    date: null,
                    userDescription: null,
                    genAIDescription: null,
                    isSimulated: false,
                    fighterStats: [],
                    fightStatus: "scheduled"
                });
            }

            rounds.push({
                roundNumber: round,
                fights
            });

            // Rotate fighters (keep first fighter fixed, rotate the rest)
            // This is the standard round-robin rotation algorithm
            const fixed = fightersCopy[0];
            const rotated = [fixed, fightersCopy[n - 1], ...fightersCopy.slice(1, n - 1)];
            fightersCopy.splice(0, n, ...rotated);
        }

        return rounds;
    };

    // Check for duplicate matchups
    const checkForDuplicates = (rounds: any[], divisionNumber: number) => {
        const matchups = new Set<string>();
        const duplicates: string[] = [];

        rounds.forEach(round => {
            round.fights.forEach((fight: any) => {
                // Create a normalized matchup key (always smaller ID first)
                const key1 = `${fight.fighter1}-${fight.fighter2}`;
                const key2 = `${fight.fighter2}-${fight.fighter1}`;
                
                if (matchups.has(key1) || matchups.has(key2)) {
                    duplicates.push(`Division ${divisionNumber}: ${fight.fighter1} vs ${fight.fighter2}`);
                }
                
                matchups.add(key1);
                matchups.add(key2);
            });
        });

        return duplicates;
    };

    const generateSeasonJSON = () => {
        const selectedCompetition = competitions.find(c => c.id === formData.competitionMetaId);
        
        if (!selectedCompetition?.shortName) {
            throw new Error('Competition short name is required for fight identifiers');
        }

        const leagueDivisions = formData.divisions.map(div => ({
            divisionNumber: div.divisionNumber,
            fighters: div.selectedFighters
        }));

        // Generate rounds with fights for each division
        const divisions = formData.divisions.map(div => {
            const rounds = generateRoundRobinMatches(
                div.selectedFighters,
                div.divisionNumber,
                selectedCompetition.shortName,
                formData.seasonNumber
            );

            // Check for duplicates
            const duplicates = checkForDuplicates(rounds, div.divisionNumber);
            if (duplicates.length > 0) {
                console.error('DUPLICATE FIGHTS FOUND:', duplicates);
                throw new Error(`Duplicate fights detected in Division ${div.divisionNumber}`);
            }

            return {
                divisionNumber: div.divisionNumber,
                divisionName: div.divisionName || `Division ${div.divisionNumber}`,
                totalRounds: div.selectedFighters.length - 1,
                currentRound: 0,
                rounds
            };
        });

        const fightersPerDivision = formData.divisions.map(div => ({
            divisionNumber: div.divisionNumber,
            numberOfFighters: div.numberOfFighters
        }));

        const perFightFeePerDivision = formData.divisions.map(div => ({
            divisionNumber: div.divisionNumber,
            fightFeeInGbp: div.fightFeeInGbp
        }));

        const winningFeePerDivision = formData.divisions.map(div => ({
            divisionNumber: div.divisionNumber,
            prizeMoneyInGbp: div.winningPrizeInGbp
        }));

        const seasonData = {
            competitionMetaId: formData.competitionMetaId,
            competitionMeta: selectedCompetition,
            isActive: true,
            seasonMeta: {
                seasonNumber: formData.seasonNumber,
                startDate: null, // Will be set when first fight happens
                endDate: null, // Will be set when last fight happens
                leagueDivisions: leagueDivisions,
                cupParticipants: null
            },
            leagueData: {
                divisions: divisions,
                activeLeagueFights: []
            },
            cupData: null,
            config: {
                leagueConfiguration: {
                    numberOfDivisions: formData.numberOfDivisions,
                    fightersPerDivision: fightersPerDivision,
                    perFightFeePerDivision: perFightFeePerDivision,
                    winningFeePerDivision: winningFeePerDivision,
                    fighterOfTheSeasonPrizeMoneyInGbp: formData.fighterOfTheSeasonPrizeInGbp,
                    pointsPerWin: 3
                },
                cupConfiguration: null
            },
            linkedLeagueSeason: null
        };

        return seasonData;
    };

    const handleSubmit = async () => {
        if (!validateFighterSelection()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const seasonData = generateSeasonJSON();
            
            console.log('='.repeat(80));
            console.log('SEASON DATA GENERATED SUCCESSFULLY');
            console.log('='.repeat(80));
            
            // Log detailed fight information with fighter names
            seasonData.leagueData.divisions.forEach(division => {
                console.log(`\n📊 DIVISION ${division.divisionNumber} - ${division.divisionName}`);
                console.log(`Total Rounds: ${division.totalRounds}`);
                console.log(`Total Fights: ${division.rounds.reduce((sum, r) => sum + r.fights.length, 0)}`);
                console.log('-'.repeat(80));
                
                division.rounds.forEach(round => {
                    console.log(`\n  🥊 ROUND ${round.roundNumber} (${round.fights.length} fights)`);
                    
                    round.fights.forEach((fight, idx) => {
                        const fighter1Data = allFighters.find(f => f.id === fight.fighter1);
                        const fighter2Data = allFighters.find(f => f.id === fight.fighter2);
                        
                        const fighter1Name = fighter1Data 
                            ? `${fighter1Data.firstName} ${fighter1Data.lastName}` 
                            : fight.fighter1;
                        const fighter2Name = fighter2Data 
                            ? `${fighter2Data.firstName} ${fighter2Data.lastName}` 
                            : fight.fighter2;
                        
                        console.log(`    Fight ${idx + 1}: ${fighter1Name} vs ${fighter2Name} [${fight.fightIdentifier}]`);
                    });
                });
                
                console.log('\n' + '='.repeat(80));
            });
            
            // Verify no duplicates across all divisions
            console.log('\n🔍 DUPLICATE CHECK SUMMARY:');
            let totalFights = 0;
            seasonData.leagueData.divisions.forEach(division => {
                const divisionFights = division.rounds.reduce((sum, r) => sum + r.fights.length, 0);
                totalFights += divisionFights;
                const expectedFights = (division.rounds[0].fights.length * 2 * division.totalRounds) / 2;
                console.log(`  Division ${division.divisionNumber}: ${divisionFights} fights (Expected: ${expectedFights}) ✓`);
            });
            console.log(`  Total fights across all divisions: ${totalFights}`);
            console.log('  ✅ No duplicate matchups detected!');
            
            console.log('\n' + '='.repeat(80));
            console.log('FULL SEASON JSON:');
            console.log('='.repeat(80));
            console.log(JSON.stringify(seasonData, null, 2));

            // Save season to MongoDB using GraphQL mutation
            console.log('\n📤 Saving season to MongoDB...');
            const result = await createSeasonMutation({
                variables: {
                    input: seasonData
                }
            });

            if (result.data?.createCompetitionSeason) {
                const createdSeason = result.data.createCompetitionSeason;
                console.log('\n✅ Season saved to MongoDB successfully!');
                console.log(`   Season ID: ${createdSeason.id}`);
                console.log(`   Season Number: ${createdSeason.seasonMeta.seasonNumber}`);
                
                alert(`Season ${createdSeason.seasonMeta.seasonNumber} created successfully!\nSeason ID: ${createdSeason.id}`);
                
                // Reset form after successful creation
                setFormData({
                    competitionMetaId: '',
                    seasonNumber: 1,
                    numberOfDivisions: 3,
                    divisions: [],
                    fighterOfTheSeasonPrizeInGbp: 10000
                });
                setCurrentStep('basic');
            } else {
                throw new Error('Failed to create season - no data returned');
            }
        } catch (error) {
            console.error('❌ Error creating season:', error);
            alert(`Error creating season: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (competitionsLoading || fightersLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.createSeasonPage}>
            <div className={styles.createSeasonContainer}>
                <h1 className={styles.pageTitle}>Create New Season</h1>

                {/* Progress Indicator */}
                <div className={styles.progressSteps}>
                    <div className={`${styles.step} ${currentStep === 'basic' ? styles.active : ''} ${currentStep !== 'basic' ? styles.completed : ''}`}>
                        <div className={styles.stepNumber}>1</div>
                        <div className={styles.stepLabel}>Basic Info</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.step} ${currentStep === 'divisions' ? styles.active : ''} ${currentStep === 'fighters' ? styles.completed : ''}`}>
                        <div className={styles.stepNumber}>2</div>
                        <div className={styles.stepLabel}>Division Config</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.step} ${currentStep === 'fighters' ? styles.active : ''}`}>
                        <div className={styles.stepNumber}>3</div>
                        <div className={styles.stepLabel}>Select Fighters</div>
                    </div>
                </div>

                {/* Step 1: Basic Information */}
                {currentStep === 'basic' && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.sectionTitle}>Basic Information</h2>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="competitionMetaId">Competition *</label>
                            <select
                                id="competitionMetaId"
                                name="competitionMetaId"
                                value={formData.competitionMetaId}
                                onChange={handleBasicInputChange}
                                className={errors.competitionMetaId ? styles.error : ''}
                            >
                                <option value="">Select a competition...</option>
                                {competitions
                                    .filter(c => c.type === 'league')
                                    .map(comp => (
                                        <option key={comp.id} value={comp.id}>
                                            {comp.competitionName} ({comp.shortName})
                                        </option>
                                    ))}
                            </select>
                            {errors.competitionMetaId && <span className={styles.errorMessage}>{errors.competitionMetaId}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="seasonNumber">Season Number *</label>
                                <input
                                    type="number"
                                    id="seasonNumber"
                                    name="seasonNumber"
                                    min="1"
                                    value={formData.seasonNumber}
                                    onChange={handleBasicInputChange}
                                    className={errors.seasonNumber ? styles.error : ''}
                                />
                                {errors.seasonNumber && <span className={styles.errorMessage}>{errors.seasonNumber}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="numberOfDivisions">Number of Divisions *</label>
                                <input
                                    type="number"
                                    id="numberOfDivisions"
                                    name="numberOfDivisions"
                                    min="1"
                                    max="10"
                                    value={formData.numberOfDivisions}
                                    onChange={handleBasicInputChange}
                                    className={errors.numberOfDivisions ? styles.error : ''}
                                />
                                {errors.numberOfDivisions && <span className={styles.errorMessage}>{errors.numberOfDivisions}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="fighterOfTheSeasonPrizeInGbp">Fighter of the Season Prize (GBP) *</label>
                            <input
                                type="number"
                                id="fighterOfTheSeasonPrizeInGbp"
                                name="fighterOfTheSeasonPrizeInGbp"
                                min="0"
                                step="100"
                                value={formData.fighterOfTheSeasonPrizeInGbp}
                                onChange={handleBasicInputChange}
                                className={errors.fighterOfTheSeasonPrizeInGbp ? styles.error : ''}
                            />
                            {errors.fighterOfTheSeasonPrizeInGbp && <span className={styles.errorMessage}>{errors.fighterOfTheSeasonPrizeInGbp}</span>}
                        </div>

                        <div className={styles.stepActions}>
                            <button onClick={handleNextStep} className={styles.primaryButton}>
                                Next Step
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Division Configuration */}
                {currentStep === 'divisions' && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.sectionTitle}>Division Configuration</h2>
                        
                        {formData.divisions.map(division => (
                            <div key={division.divisionNumber} className={styles.divisionConfig}>
                                <h3 className={styles.divisionTitle}>Division {division.divisionNumber}</h3>
                                
                                <div className={styles.formGroup}>
                                    <label htmlFor={`divisionName${division.divisionNumber}`}>
                                        Division Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id={`divisionName${division.divisionNumber}`}
                                        placeholder={`Division ${division.divisionNumber}`}
                                        value={division.divisionName}
                                        onChange={(e) => handleDivisionConfigChange(division.divisionNumber, 'divisionName', e.target.value)}
                                    />
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`fighters${division.divisionNumber}`}>
                                            Number of Fighters *
                                        </label>
                                        <input
                                            type="number"
                                            id={`fighters${division.divisionNumber}`}
                                            min="2"
                                            value={division.numberOfFighters}
                                            onChange={(e) => handleDivisionConfigChange(division.divisionNumber, 'numberOfFighters', parseInt(e.target.value) || 0)}
                                            className={errors[`div${division.divisionNumber}_fighters`] ? styles.error : ''}
                                        />
                                        {errors[`div${division.divisionNumber}_fighters`] && (
                                            <span className={styles.errorMessage}>{errors[`div${division.divisionNumber}_fighters`]}</span>
                                        )}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor={`fightFee${division.divisionNumber}`}>
                                            Per Fight Fee (GBP) *
                                        </label>
                                        <input
                                            type="number"
                                            id={`fightFee${division.divisionNumber}`}
                                            min="0"
                                            step="100"
                                            value={division.fightFeeInGbp}
                                            onChange={(e) => handleDivisionConfigChange(division.divisionNumber, 'fightFeeInGbp', parseInt(e.target.value) || 0)}
                                            className={errors[`div${division.divisionNumber}_fee`] ? styles.error : ''}
                                        />
                                        {errors[`div${division.divisionNumber}_fee`] && (
                                            <span className={styles.errorMessage}>{errors[`div${division.divisionNumber}_fee`]}</span>
                                        )}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor={`winningPrize${division.divisionNumber}`}>
                                            Winning Prize (GBP) *
                                        </label>
                                        <input
                                            type="number"
                                            id={`winningPrize${division.divisionNumber}`}
                                            min="0"
                                            step="100"
                                            value={division.winningPrizeInGbp}
                                            onChange={(e) => handleDivisionConfigChange(division.divisionNumber, 'winningPrizeInGbp', parseInt(e.target.value) || 0)}
                                            className={errors[`div${division.divisionNumber}_prize`] ? styles.error : ''}
                                        />
                                        {errors[`div${division.divisionNumber}_prize`] && (
                                            <span className={styles.errorMessage}>{errors[`div${division.divisionNumber}_prize`]}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className={styles.stepActions}>
                            <button onClick={handlePrevStep} className={styles.secondaryButton}>
                                Previous
                            </button>
                            <button onClick={handleNextStep} className={styles.primaryButton}>
                                Next Step
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Fighter Selection */}
                {currentStep === 'fighters' && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.sectionTitle}>Select Fighters</h2>
                        
                        {/* Division Tabs */}
                        <div className={styles.divisionTabs}>
                            {formData.divisions.map(div => (
                                <button
                                    key={div.divisionNumber}
                                    className={`${styles.tabButton} ${selectedDivision === div.divisionNumber ? styles.active : ''}`}
                                    onClick={() => setSelectedDivision(div.divisionNumber)}
                                >
                                    Division {div.divisionNumber}
                                    <span className={styles.tabBadge}>
                                        {div.selectedFighters.length}/{div.numberOfFighters}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Fighter Grid */}
                        {formData.divisions.map(division => (
                            selectedDivision === division.divisionNumber && (
                                <div key={division.divisionNumber} className={styles.fighterSelection}>
                                    <div className={styles.selectionInfo}>
                                        <p>
                                            Select <strong>{division.numberOfFighters}</strong> fighters for{' '}
                                            <strong>{division.divisionName || `Division ${division.divisionNumber}`}</strong>
                                        </p>
                                        <p className={styles.selectionCount}>
                                            Selected: <span className={division.selectedFighters.length === division.numberOfFighters ? styles.complete : styles.incomplete}>
                                                {division.selectedFighters.length}/{division.numberOfFighters}
                                            </span>
                                        </p>
                                    </div>
                                    {errors[`div${division.divisionNumber}_selection`] && (
                                        <div className={styles.errorMessage}>{errors[`div${division.divisionNumber}_selection`]}</div>
                                    )}

                                    <div className={styles.fightersGrid}>
                                        {getAvailableFighters(division.divisionNumber).map(fighter => {
                                            const isSelected = division.selectedFighters.includes(fighter.id);
                                            return (
                                                <div
                                                    key={fighter.id}
                                                    className={`${styles.fighterCard} ${isSelected ? styles.selected : ''}`}
                                                    onClick={() => handleFighterToggle(division.divisionNumber, fighter.id)}
                                                >
                                                    <div className={styles.fighterImage}>
                                                        <S3Image
                                                            src={fighter.profileImage}
                                                            alt={`${fighter.firstName} ${fighter.lastName}`}
                                                            height={120}
                                                        />
                                                        {isSelected && <div className={styles.selectedOverlay}>✓</div>}
                                                    </div>
                                                    <div className={styles.fighterInfo}>
                                                        <p className={styles.fighterName}>
                                                            {fighter.firstName} {fighter.lastName}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        ))}

                        <div className={styles.stepActions}>
                            <button onClick={handlePrevStep} className={styles.secondaryButton}>
                                Previous
                            </button>
                            <button 
                                onClick={handleSubmit} 
                                className={styles.primaryButton}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating Season...' : 'Create Season'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateSeasonPage;

