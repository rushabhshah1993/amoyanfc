import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import styles from './FightGenerationLoader.module.css';

interface FightGenerationLoaderProps {
    message: string;
}

const FightGenerationLoader: React.FC<FightGenerationLoaderProps> = ({ message }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.loaderContainer}>
                <FontAwesomeIcon icon={faSpinner} spin className={styles.spinner} />
                <h2 className={styles.title}>Generating Fight Result</h2>
                <p className={styles.message}>{message}</p>
                <div className={styles.dots}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
};

export default FightGenerationLoader;

