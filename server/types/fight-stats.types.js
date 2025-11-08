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
        attempted: Int
        defence: Float
        landed: Int
        landedPerMinute: Float
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
        attemptsPer15Mins: Float
        average: Float
    }

    type TakedownData {
        accuracy: Float
        attempted: Int
        avgTakedownsLandedPerMin: Float
        defence: Float
        landed: Int
    }
`;

export default fightStatsTypes;
