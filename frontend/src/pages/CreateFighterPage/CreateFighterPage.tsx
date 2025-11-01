import React, { useState } from 'react';
import styles from './CreateFighterPage.module.css';

interface FighterFormData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    profileImage: File | null;
    skillset: string[];
    locationCity: string;
    locationCountry: string;
    heightFeet: string;
    heightCm: number;
    weightKg: number;
    armReach: number;
    legReach: number;
    bodyType: string;
    koPower: number;
    durability: number;
    strength: number;
    endurance: number;
    agility: number;
}

const PREDEFINED_SKILLS = [
    'MMA',
    'Brazilian Jiu-Jitsu',
    'Muay Thai',
    'Boxing',
    'Wrestling',
    'Kickboxing',
    'Judo',
    'Karate',
    'Taekwondo',
    'Sambo'
];

const CreateFighterPage: React.FC = () => {
    const [formData, setFormData] = useState<FighterFormData>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        profileImage: null,
        skillset: [],
        locationCity: '',
        locationCountry: '',
        heightFeet: '',
        heightCm: 0,
        weightKg: 0,
        armReach: 0,
        legReach: 0,
        bodyType: '',
        koPower: 5,
        durability: 5,
        strength: 5,
        endurance: 5,
        agility: 5
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [customSkill, setCustomSkill] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Convert feet/inches format to cm
    const convertHeightToCm = (heightFeet: string): number => {
        const match = heightFeet.match(/^(\d+)'(\d+)(?:")?$/);
        if (!match) return 0;
        
        const feet = parseInt(match[1]);
        const inches = parseInt(match[2]);
        const totalInches = (feet * 12) + inches;
        const cm = Math.round(totalInches * 2.54);
        
        return cm;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'heightFeet') {
            const cm = convertHeightToCm(value);
            setFormData(prev => ({
                ...prev,
                heightFeet: value,
                heightCm: cm
            }));
        } else if (name === 'weightKg' || name === 'armReach' || name === 'legReach') {
            setFormData(prev => ({
                ...prev,
                [name]: value ? parseFloat(value) : 0
            }));
        } else if (name === 'koPower' || name === 'durability' || name === 'strength' || name === 'endurance' || name === 'agility') {
            const numValue = parseFloat(value);
            if (numValue >= 1 && numValue <= 10) {
                setFormData(prev => ({
                    ...prev,
                    [name]: numValue
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, profileImage: file }));
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSkillToggle = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            skillset: prev.skillset.includes(skill)
                ? prev.skillset.filter(s => s !== skill)
                : [...prev.skillset, skill]
        }));
    };

    const handleAddCustomSkill = () => {
        if (customSkill.trim() && !formData.skillset.includes(customSkill.trim())) {
            setFormData(prev => ({
                ...prev,
                skillset: [...prev.skillset, customSkill.trim()]
            }));
            setCustomSkill('');
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            skillset: prev.skillset.filter(s => s !== skill)
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.profileImage) newErrors.profileImage = 'Profile image is required';
        if (formData.skillset.length === 0) newErrors.skillset = 'At least one skill is required';
        if (!formData.locationCity.trim()) newErrors.locationCity = 'City is required';
        if (!formData.locationCountry.trim()) newErrors.locationCountry = 'Country is required';
        if (!formData.heightFeet.match(/^\d+'\d+(?:")?$/)) newErrors.heightFeet = 'Height must be in format: 5\'10" or 5\'10';
        if (formData.weightKg <= 0) newErrors.weightKg = 'Weight must be greater than 0';
        if (formData.armReach <= 0) newErrors.armReach = 'Arm reach must be greater than 0';
        if (formData.legReach <= 0) newErrors.legReach = 'Leg reach must be greater than 0';
        if (!formData.bodyType.trim()) newErrors.bodyType = 'Body type description is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadImageToS3 = async (file: File, fighterId: string, firstName: string, lastName: string): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('fighterId', fighterId);
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);

        const response = await fetch('/api/upload/fighter-profile', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        const data = await response.json();
        return data.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate a temporary MongoDB-like ID for demo purposes
            const tempMongoId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Upload image to S3 (commented out for now)
            // const profileImageUrl = await uploadImageToS3(
            //     formData.profileImage!,
            //     tempMongoId,
            //     formData.firstName,
            //     formData.lastName
            // );

            // Create fighter JSON object
            const fighterData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
                // profileImage: profileImageUrl, // Uncomment when S3 upload is working
                profileImage: `https://amoyanfc-assets.s3.us-east-1.amazonaws.com/fighters/${tempMongoId}-${formData.firstName.toLowerCase()}-${formData.lastName.toLowerCase()}/ai-fight-pose.jpg`,
                skillset: formData.skillset,
                location: {
                    city: formData.locationCity,
                    country: formData.locationCountry
                },
                physicalAttributes: {
                    heightCm: formData.heightCm,
                    heightFeet: formData.heightFeet,
                    weightKg: formData.weightKg,
                    armReach: formData.armReach,
                    legReach: formData.legReach,
                    bodyType: formData.bodyType,
                    koPower: formData.koPower,
                    durability: formData.durability,
                    strength: formData.strength,
                    endurance: formData.endurance,
                    agility: formData.agility
                },
                // These fields will be auto-generated by the backend
                globalRank: null,
                fightStats: {},
                streaks: [],
                opponentsHistory: [],
                competitionHistory: [],
                isArchived: false,
                debutInformation: null,
                images: [],
                earnings: {
                    earningsInEur: 0,
                    earningsBreakdown: []
                }
            };

            console.log('Fighter JSON:', JSON.stringify(fighterData, null, 2));

            // TODO: Make API call to save to MongoDB
            // const response = await fetch('/api/fighters', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(fighterData),
            // });
            // 
            // if (!response.ok) {
            //     throw new Error('Failed to create fighter');
            // }
            // 
            // const result = await response.json();
            // console.log('Fighter created:', result);
            
            alert('Fighter data generated! Check console for JSON.');
            
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                profileImage: null,
                skillset: [],
                locationCity: '',
                locationCountry: '',
                heightFeet: '',
                heightCm: 0,
                weightKg: 0,
                armReach: 0,
                legReach: 0,
                bodyType: '',
                koPower: 5,
                durability: 5,
                strength: 5,
                endurance: 5,
                agility: 5
            });
            setImagePreview(null);
            setErrors({});
        } catch (error) {
            console.error('Error creating fighter:', error);
            alert('Error creating fighter. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.createFighterPage}>
            <div className={styles.createFighterContainer}>
                <h1 className={styles.pageTitle}>Create New Fighter</h1>
                
                <form onSubmit={handleSubmit} className={styles.fighterForm}>
                    {/* Basic Information */}
                    <section className={styles.formSection}>
                        <h2 className={styles.sectionTitle}>Basic Information</h2>
                        
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className={errors.firstName ? styles.error : ''}
                                />
                                {errors.firstName && <span className={styles.errorMessage}>{errors.firstName}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className={errors.lastName ? styles.error : ''}
                                />
                                {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="dateOfBirth">Date of Birth *</label>
                            <input
                                type="date"
                                id="dateOfBirth"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleInputChange}
                                className={errors.dateOfBirth ? styles.error : ''}
                            />
                            {errors.dateOfBirth && <span className={styles.errorMessage}>{errors.dateOfBirth}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="profileImage">Profile Image *</label>
                            <input
                                type="file"
                                id="profileImage"
                                accept="image/*"
                                onChange={handleImageChange}
                                className={errors.profileImage ? styles.error : ''}
                            />
                            {errors.profileImage && <span className={styles.errorMessage}>{errors.profileImage}</span>}
                            {imagePreview && (
                                <div className={styles.imagePreview}>
                                    <img src={imagePreview} alt="Profile preview" />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Skillset */}
                    <section className={styles.formSection}>
                        <h2 className={styles.sectionTitle}>Skillset *</h2>
                        
                        <div className={styles.skillsGrid}>
                            {PREDEFINED_SKILLS.map(skill => (
                                <button
                                    key={skill}
                                    type="button"
                                    className={`${styles.skillButton} ${formData.skillset.includes(skill) ? styles.selected : ''}`}
                                    onClick={() => handleSkillToggle(skill)}
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>

                        <div className={styles.customSkillInput}>
                            <input
                                type="text"
                                placeholder="Add custom skill"
                                value={customSkill}
                                onChange={(e) => setCustomSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                            />
                            <button type="button" onClick={handleAddCustomSkill}>Add</button>
                        </div>

                        {formData.skillset.length > 0 && (
                            <div className={styles.selectedSkills}>
                                <h3>Selected Skills:</h3>
                                <div className={styles.skillsTags}>
                                    {formData.skillset.map(skill => (
                                        <span key={skill} className={styles.skillTag}>
                                            {skill}
                                            <button type="button" onClick={() => handleRemoveSkill(skill)}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {errors.skillset && <span className={styles.errorMessage}>{errors.skillset}</span>}
                    </section>

                    {/* Location */}
                    <section className={styles.formSection}>
                        <h2 className={styles.sectionTitle}>Location</h2>
                        
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="locationCity">City *</label>
                                <input
                                    type="text"
                                    id="locationCity"
                                    name="locationCity"
                                    value={formData.locationCity}
                                    onChange={handleInputChange}
                                    className={errors.locationCity ? styles.error : ''}
                                />
                                {errors.locationCity && <span className={styles.errorMessage}>{errors.locationCity}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="locationCountry">Country *</label>
                                <input
                                    type="text"
                                    id="locationCountry"
                                    name="locationCountry"
                                    value={formData.locationCountry}
                                    onChange={handleInputChange}
                                    className={errors.locationCountry ? styles.error : ''}
                                />
                                {errors.locationCountry && <span className={styles.errorMessage}>{errors.locationCountry}</span>}
                            </div>
                        </div>
                    </section>

                    {/* Physical Attributes */}
                    <section className={styles.formSection}>
                        <h2 className={styles.sectionTitle}>Physical Attributes</h2>
                        
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="heightFeet">Height (feet) *</label>
                                <input
                                    type="text"
                                    id="heightFeet"
                                    name="heightFeet"
                                    placeholder="5'10&quot;"
                                    value={formData.heightFeet}
                                    onChange={handleInputChange}
                                    className={errors.heightFeet ? styles.error : ''}
                                />
                                {errors.heightFeet && <span className={styles.errorMessage}>{errors.heightFeet}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="heightCm">Height (cm)</label>
                                <input
                                    type="number"
                                    id="heightCm"
                                    name="heightCm"
                                    value={formData.heightCm || ''}
                                    disabled
                                    className={styles.disabledInput}
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="weightKg">Weight (kg) *</label>
                                <input
                                    type="number"
                                    id="weightKg"
                                    name="weightKg"
                                    min="1"
                                    step="0.1"
                                    value={formData.weightKg || ''}
                                    onChange={handleInputChange}
                                    className={errors.weightKg ? styles.error : ''}
                                />
                                {errors.weightKg && <span className={styles.errorMessage}>{errors.weightKg}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="armReach">Arm Reach (cm) *</label>
                                <input
                                    type="number"
                                    id="armReach"
                                    name="armReach"
                                    min="1"
                                    step="0.1"
                                    value={formData.armReach || ''}
                                    onChange={handleInputChange}
                                    className={errors.armReach ? styles.error : ''}
                                />
                                {errors.armReach && <span className={styles.errorMessage}>{errors.armReach}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="legReach">Leg Reach (cm) *</label>
                                <input
                                    type="number"
                                    id="legReach"
                                    name="legReach"
                                    min="1"
                                    step="0.1"
                                    value={formData.legReach || ''}
                                    onChange={handleInputChange}
                                    className={errors.legReach ? styles.error : ''}
                                />
                                {errors.legReach && <span className={styles.errorMessage}>{errors.legReach}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="bodyType">Body Type Description *</label>
                            <textarea
                                id="bodyType"
                                name="bodyType"
                                rows={3}
                                placeholder="e.g., Athletic build, lean and muscular..."
                                value={formData.bodyType}
                                onChange={handleInputChange}
                                className={errors.bodyType ? styles.error : ''}
                            />
                            {errors.bodyType && <span className={styles.errorMessage}>{errors.bodyType}</span>}
                        </div>

                        <h3 className={styles.subsectionTitle}>Combat Ratings (1-10)</h3>
                        
                        <div className={styles.ratingsGrid}>
                            <div className={styles.formGroup}>
                                <label htmlFor="koPower">KO Power *</label>
                                <input
                                    type="number"
                                    id="koPower"
                                    name="koPower"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={formData.koPower}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="durability">Durability *</label>
                                <input
                                    type="number"
                                    id="durability"
                                    name="durability"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={formData.durability}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="strength">Strength *</label>
                                <input
                                    type="number"
                                    id="strength"
                                    name="strength"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={formData.strength}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="endurance">Endurance *</label>
                                <input
                                    type="number"
                                    id="endurance"
                                    name="endurance"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={formData.endurance}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="agility">Agility *</label>
                                <input
                                    type="number"
                                    id="agility"
                                    name="agility"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={formData.agility}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </section>

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Fighter...' : 'Create Fighter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFighterPage;

