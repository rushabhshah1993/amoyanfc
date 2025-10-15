import React from 'react';
import './PhysicalAttributes.css';

interface PhysicalAttributesData {
    heightCm?: number;
    heightFeet?: string;
    weightKg?: number;
    armReach?: number;
    legReach?: number;
    bodyType?: string;
    koPower?: number;
    durability?: number;
    strength?: number;
    endurance?: number;
    agility?: number;
}

interface PhysicalAttributesProps {
    attributes: PhysicalAttributesData;
}

const PhysicalAttributes: React.FC<PhysicalAttributesProps> = ({ attributes }) => {
    if (!attributes) {
        return null;
    }

    return (
        <div className="physical-attributes-section">
            <div className="physical-attributes-content">
                <h2 className="physical-attributes-title">Physical Attributes</h2>
                <div className="physical-attributes-grid">
                    {attributes.heightFeet && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Height</span>
                            <span className="physical-attribute-value">
                                {attributes.heightFeet}
                            </span>
                        </div>
                    )}
                    {attributes.weightKg && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Weight</span>
                            <span className="physical-attribute-value">
                                {attributes.weightKg} kg
                            </span>
                        </div>
                    )}
                    {attributes.bodyType && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Body Type</span>
                            <span className="physical-attribute-value">
                                {attributes.bodyType}
                            </span>
                        </div>
                    )}
                    {attributes.armReach && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Arm Reach</span>
                            <span className="physical-attribute-value">
                                {attributes.armReach} cm
                            </span>
                        </div>
                    )}
                    {attributes.legReach && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Leg Reach</span>
                            <span className="physical-attribute-value">
                                {attributes.legReach} cm
                            </span>
                        </div>
                    )}
                    {attributes.koPower && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">KO Power</span>
                            <span className="physical-attribute-value">
                                {attributes.koPower}/10
                            </span>
                        </div>
                    )}
                    {attributes.durability && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Durability</span>
                            <span className="physical-attribute-value">
                                {attributes.durability}/10
                            </span>
                        </div>
                    )}
                    {attributes.strength && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Strength</span>
                            <span className="physical-attribute-value">
                                {attributes.strength}/10
                            </span>
                        </div>
                    )}
                    {attributes.endurance && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Endurance</span>
                            <span className="physical-attribute-value">
                                {attributes.endurance}/10
                            </span>
                        </div>
                    )}
                    {attributes.agility && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-label">Agility</span>
                            <span className="physical-attribute-value">
                                {attributes.agility}/10
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhysicalAttributes;

