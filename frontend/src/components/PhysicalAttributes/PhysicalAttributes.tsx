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
                
                {/* First 5 attributes in custom layout */}
                <div className="physical-info-container">
                    <div className="physical-info-left">
                        {attributes.heightFeet && (
                            <div className="physical-info-item">
                                <span className="physical-info-label">Height</span>
                                <span className="physical-info-value">
                                    {attributes.heightFeet} ({attributes.heightCm} cm)
                                </span>
                            </div>
                        )}
                        {attributes.weightKg && (
                            <div className="physical-info-item">
                                <span className="physical-info-label">Weight</span>
                                <span className="physical-info-value">
                                    {attributes.weightKg} kg
                                </span>
                            </div>
                        )}
                        {attributes.bodyType && (
                            <div className="physical-info-item physical-info-item-last">
                                <span className="physical-info-label">Body Type</span>
                                <span className="physical-info-value">
                                    {attributes.bodyType}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="physical-info-right">
                        {attributes.armReach && (
                            <div className="physical-reach-item">
                                <span className="physical-info-label">Arm Reach</span>
                                <span className="physical-info-value">
                                    {attributes.armReach} cm
                                </span>
                            </div>
                        )}
                        {attributes.legReach && (
                            <div className="physical-reach-item">
                                <span className="physical-info-label">Leg Reach</span>
                                <span className="physical-info-value">
                                    {attributes.legReach} cm
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Last 5 attributes in grid boxes */}
                <div className="physical-attributes-grid">
                    {attributes.koPower && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-power-label">KO Power (X/10)</span>
                            <span className="physical-attribute-power-value">
                                {attributes.koPower}
                            </span>
                        </div>
                    )}
                    {attributes.durability && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-power-label">Durability (X/10)</span>
                            <span className="physical-attribute-power-value">
                                {attributes.durability}
                            </span>
                        </div>
                    )}
                    {attributes.strength && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-power-label">Strength (X/10)</span>
                            <span className="physical-attribute-power-value">
                                {attributes.strength}
                            </span>
                        </div>
                    )}
                    {attributes.endurance && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-power-label">Endurance (X/10)</span>
                            <span className="physical-attribute-power-value">
                                {attributes.endurance}
                            </span>
                        </div>
                    )}
                    {attributes.agility && (
                        <div className="physical-attribute-item">
                            <span className="physical-attribute-power-label">Agility (X/10)</span>
                            <span className="physical-attribute-power-value">
                                {attributes.agility}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhysicalAttributes;

