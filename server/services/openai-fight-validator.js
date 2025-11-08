/**
 * Validation service for OpenAI fight generation responses
 * Ensures AI responses match the exact MongoDB schema structure
 */

/**
 * Validates the complete response structure from OpenAI
 * @param {Object} response - Response from OpenAI
 * @param {String} fighter1Id - Expected fighter 1 ID
 * @param {String} fighter2Id - Expected fighter 2 ID
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateFightResponse(response, fighter1Id, fighter2Id) {
    const errors = [];

    // 1. Validate top-level structure
    if (!response || typeof response !== 'object') {
        errors.push('Response must be a valid JSON object');
        return { isValid: false, errors };
    }

    // 2. Validate required top-level fields
    if (!response.genAIDescription || typeof response.genAIDescription !== 'string') {
        errors.push('Missing or invalid "genAIDescription" field (must be a non-empty string)');
    }

    if (!response.winnerId || typeof response.winnerId !== 'string') {
        errors.push('Missing or invalid "winnerId" field (must be a string)');
    } else if (response.winnerId !== fighter1Id && response.winnerId !== fighter2Id) {
        errors.push(`winnerId "${response.winnerId}" must be either "${fighter1Id}" or "${fighter2Id}"`);
    }

    if (!Array.isArray(response.fighterStats)) {
        errors.push('Missing or invalid "fighterStats" field (must be an array)');
        return { isValid: false, errors };
    }

    // 3. Validate fighterStats array length
    if (response.fighterStats.length !== 2) {
        errors.push(`fighterStats must contain exactly 2 fighters, got ${response.fighterStats.length}`);
    }

    // 4. Validate each fighter's stats
    response.fighterStats.forEach((fighterStat, index) => {
        validateFighterStats(fighterStat, index, fighter1Id, fighter2Id, errors);
    });

    // 5. Validate fighter IDs are present and unique
    const fighterIds = response.fighterStats.map(fs => fs.fighterId);
    if (!fighterIds.includes(fighter1Id)) {
        errors.push(`Missing fighterStats for fighter "${fighter1Id}"`);
    }
    if (!fighterIds.includes(fighter2Id)) {
        errors.push(`Missing fighterStats for fighter "${fighter2Id}"`);
    }
    if (fighterIds[0] === fighterIds[1]) {
        errors.push('fighterStats contains duplicate fighter IDs');
    }

    // 6. Validate winner has finishing move, loser doesn't
    const winnerStats = response.fighterStats.find(fs => fs.fighterId === response.winnerId);
    const loserStats = response.fighterStats.find(fs => fs.fighterId !== response.winnerId);
    
    if (winnerStats && !winnerStats.stats.finishingMove) {
        errors.push('Winner must have a finishingMove');
    }
    if (loserStats && loserStats.stats.finishingMove !== null) {
        errors.push('Loser must have finishingMove set to null');
    }

    // 7. Validate both fighters have same fight time
    if (response.fighterStats.length === 2) {
        const time1 = response.fighterStats[0].stats.fightTime;
        const time2 = response.fighterStats[1].stats.fightTime;
        if (time1 !== time2) {
            errors.push(`Both fighters must have same fightTime. Got ${time1} and ${time2}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates an individual fighter's stats object
 */
function validateFighterStats(fighterStat, index, fighter1Id, fighter2Id, errors) {
    const prefix = `fighterStats[${index}]`;

    // Validate fighterId
    if (!fighterStat.fighterId || typeof fighterStat.fighterId !== 'string') {
        errors.push(`${prefix}.fighterId is required and must be a string`);
    }

    // Validate stats object exists
    if (!fighterStat.stats || typeof fighterStat.stats !== 'object') {
        errors.push(`${prefix}.stats is required and must be an object`);
        return;
    }

    const stats = fighterStat.stats;

    // Validate fightTime
    if (typeof stats.fightTime !== 'number' || stats.fightTime <= 0) {
        errors.push(`${prefix}.stats.fightTime must be a positive number`);
    }

    // Validate finishingMove (string or null)
    if (stats.finishingMove !== null && typeof stats.finishingMove !== 'string') {
        errors.push(`${prefix}.stats.finishingMove must be a string or null`);
    }

    // Validate grappling
    validateGrappling(stats.grappling, `${prefix}.stats`, errors);

    // Validate significantStrikes
    validateSignificantStrikes(stats.significantStrikes, `${prefix}.stats`, errors);

    // Validate strikeMap
    validateStrikeMap(stats.strikeMap, `${prefix}.stats`, errors);

    // Validate submissions
    validateSubmissions(stats.submissions, `${prefix}.stats`, errors);

    // Validate takedowns
    validateTakedowns(stats.takedowns, `${prefix}.stats`, errors);
}

/**
 * Validates grappling schema
 */
function validateGrappling(grappling, prefix, errors) {
    if (!grappling || typeof grappling !== 'object') {
        errors.push(`${prefix}.grappling is required and must be an object`);
        return;
    }

    if (typeof grappling.accuracy !== 'number') {
        errors.push(`${prefix}.grappling.accuracy must be a number`);
    }
    if (typeof grappling.defence !== 'number') {
        errors.push(`${prefix}.grappling.defence must be a number`);
    }
}

/**
 * Validates significantStrikes schema
 */
function validateSignificantStrikes(strikes, prefix, errors) {
    if (!strikes || typeof strikes !== 'object') {
        errors.push(`${prefix}.significantStrikes is required and must be an object`);
        return;
    }

    const requiredNumbers = ['accuracy', 'attempted', 'defence', 'landed', 'landedPerMinute'];
    requiredNumbers.forEach(field => {
        if (typeof strikes[field] !== 'number') {
            errors.push(`${prefix}.significantStrikes.${field} must be a number`);
        }
    });

    // Validate positions
    if (!strikes.positions || typeof strikes.positions !== 'object') {
        errors.push(`${prefix}.significantStrikes.positions is required and must be an object`);
    } else {
        ['clinching', 'ground', 'standing'].forEach(pos => {
            if (typeof strikes.positions[pos] !== 'number') {
                errors.push(`${prefix}.significantStrikes.positions.${pos} must be a number`);
            }
        });

        // Validate mathematical consistency
        const sum = (strikes.positions.clinching || 0) + 
                    (strikes.positions.ground || 0) + 
                    (strikes.positions.standing || 0);
        if (Math.abs(sum - strikes.landed) > 1) { // Allow 1 strike tolerance for rounding
            errors.push(`${prefix}.significantStrikes: landed (${strikes.landed}) must equal sum of positions (${sum})`);
        }
    }
}

/**
 * Validates strikeMap schema
 */
function validateStrikeMap(strikeMap, prefix, errors) {
    if (!strikeMap || typeof strikeMap !== 'object') {
        errors.push(`${prefix}.strikeMap is required and must be an object`);
        return;
    }

    ['head', 'torso', 'leg'].forEach(bodyPart => {
        if (!strikeMap[bodyPart] || typeof strikeMap[bodyPart] !== 'object') {
            errors.push(`${prefix}.strikeMap.${bodyPart} is required and must be an object`);
        } else {
            if (typeof strikeMap[bodyPart].absorb !== 'number') {
                errors.push(`${prefix}.strikeMap.${bodyPart}.absorb must be a number`);
            }
            if (typeof strikeMap[bodyPart].strike !== 'number') {
                errors.push(`${prefix}.strikeMap.${bodyPart}.strike must be a number`);
            }
        }
    });
}

/**
 * Validates submissions schema
 */
function validateSubmissions(submissions, prefix, errors) {
    if (!submissions || typeof submissions !== 'object') {
        errors.push(`${prefix}.submissions is required and must be an object`);
        return;
    }

    if (typeof submissions.attemptsPer15Mins !== 'number') {
        errors.push(`${prefix}.submissions.attemptsPer15Mins must be a number`);
    }
    if (typeof submissions.average !== 'number') {
        errors.push(`${prefix}.submissions.average must be a number`);
    }
}

/**
 * Validates takedowns schema
 */
function validateTakedowns(takedowns, prefix, errors) {
    if (!takedowns || typeof takedowns !== 'object') {
        errors.push(`${prefix}.takedowns is required and must be an object`);
        return;
    }

    const requiredNumbers = ['accuracy', 'attempted', 'avgTakedownsLandedPerMin', 'defence', 'landed'];
    requiredNumbers.forEach(field => {
        if (typeof takedowns[field] !== 'number') {
            errors.push(`${prefix}.takedowns.${field} must be a number`);
        }
    });
}

/**
 * Auto-fixes common issues in the response
 * @param {Object} response - Response from OpenAI
 * @param {String} fighter1Id - Fighter 1 ID
 * @param {String} fighter2Id - Fighter 2 ID
 * @returns {Object} Fixed response
 */
export function autoFixResponse(response, fighter1Id, fighter2Id) {
    const fixed = { ...response };

    // Fix missing fighterStats
    if (!Array.isArray(fixed.fighterStats)) {
        fixed.fighterStats = [];
    }

    // Fix fighter IDs if incorrect
    if (fixed.fighterStats.length === 2) {
        const ids = fixed.fighterStats.map(fs => fs.fighterId);
        if (!ids.includes(fighter1Id) || !ids.includes(fighter2Id)) {
            console.warn('Fixing incorrect fighter IDs in response');
            fixed.fighterStats[0].fighterId = fighter1Id;
            fixed.fighterStats[1].fighterId = fighter2Id;
        }
    }

    // Fix winner ID if invalid
    if (fixed.winnerId !== fighter1Id && fixed.winnerId !== fighter2Id) {
        console.warn('Fixing invalid winner ID');
        // Try to determine from finishing move
        const winnerStats = fixed.fighterStats?.find(fs => fs.stats?.finishingMove);
        if (winnerStats) {
            fixed.winnerId = winnerStats.fighterId;
        } else {
            fixed.winnerId = fighter1Id; // Default
        }
    }

    // Ensure winner has finishing move
    const winnerStats = fixed.fighterStats?.find(fs => fs.fighterId === fixed.winnerId);
    if (winnerStats && !winnerStats.stats.finishingMove) {
        console.warn('Adding default finishing move to winner');
        winnerStats.stats.finishingMove = 'Knockout strike';
    }

    // Ensure loser has null finishing move
    const loserStats = fixed.fighterStats?.find(fs => fs.fighterId !== fixed.winnerId);
    if (loserStats && loserStats.stats.finishingMove !== null) {
        console.warn('Setting loser finishingMove to null');
        loserStats.stats.finishingMove = null;
    }

    // Sync fight times
    if (fixed.fighterStats.length === 2) {
        const time1 = fixed.fighterStats[0].stats.fightTime;
        const time2 = fixed.fighterStats[1].stats.fightTime;
        if (time1 !== time2) {
            console.warn(`Syncing fight times: ${time1} and ${time2}`);
            const avgTime = (time1 + time2) / 2;
            fixed.fighterStats[0].stats.fightTime = avgTime;
            fixed.fighterStats[1].stats.fightTime = avgTime;
        }
    }

    return fixed;
}

