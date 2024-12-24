const fightStatsTypes = `#graphql
    type FightStats {
        avgFightTime: Float
        finishingMoves: [String]
        grappling: GrapplingData
        significantStrikes: SignificantStrikesData
        strikeMap: StrikeMapData
        submissions: SubmissionData
        takedowns: TakedownData
    }

    type GrapplingData {
        accuracy: Float
        defence: Float
    }

    type SignificantStrikesData {
        accuracy: Float
        attempted: Int
        defence: Int
        landed: Int
        landedPerMinute: Int
        positions: SignificantStrikePositionsData
    }

    type SignificantStrikePositionsData {
        clinching: Int
        ground: Int
        standing: Int
    }

    type StrikeMapData {
        head: StrikeMapMetricData
        torso: StrikeMapMetricData
        leg: StrikeMapMetricData
    }

    type StrikeMapMetricData {
        absorb: Int
        strike: Int
    }

    type SubmissionData {
        attemptsPer15Mins: Int
        average: Int
    }

    type TakedownData {
        accuracy: Float
        attempted: Int
        avgTakedownsLandedPerMin: Float
        defence: Int
        landed: Int
    }
`;

export default fightStatsTypes;
