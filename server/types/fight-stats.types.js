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

    type IndividualFighterStats {
        fighterId: ID
        stats: FightStatistics
    }

    type FightStatistics {
        fightTime: Float
        finishingMove: String
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
        attempted: Float
        defence: Float
        landed: Float
        landedPerMinute: Float
        positions: SignificantStrikePositionsData
    }

    type SignificantStrikePositionsData {
        clinching: Float
        ground: Float
        standing: Float
    }

    type StrikeMapData {
        head: StrikeMapMetricData
        torso: StrikeMapMetricData
        leg: StrikeMapMetricData
    }

    type StrikeMapMetricData {
        absorb: Float
        strike: Float
    }

    type SubmissionData {
        attemptsPer15Mins: Float
        average: Float
    }

    type TakedownData {
        accuracy: Float
        attempted: Float
        avgTakedownsLandedPerMin: Float
        defence: Float
        landed: Float
    }
`;

export default fightStatsTypes;
