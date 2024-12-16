const fightStatsInput = `#graphql
    input FightStatsInput {
        avgFightTime: Float
        finishingMoves: [String]
        grappling: GrapplingInput
        significantStrikes: SignificantStrikesInput
        strikeMap: StrikeMapInput
        submissions: SubmissionInput
        takedowns: TakedownInput
    }

    input GrapplingInput {
        accuracy: Float
        defence: Float
    }

    input SignificantStrikesInput {
        accuracy: Float
        attempted: Int
        defence: Int
        landed: Int
        landedPerMinute: Int
        positions: SignificantStrikePositionsInput
    }

    input SignificantStrikePositionsInput {
        clinching: Int
        ground: Int
        standing: Int
    }

    input StrikeMapInput {
        head: StrikeMapMetricInput
        torso: StrikeMapMetricInput
        leg: StrikeMapMetricInput
    }

    input StrikeMapMetricInput {
        absorb: Int
        strike: Int
    }

    input SubmissionInput {
        attemptsPer15Mins: Int
        average: Int
    }

    input TakedownInput {
        accuracy: Float
        attempted: Int
        avgTakedownsLandedPerMin: Float
        defence: Int
        landed: Int
    }
`;

export default fightStatsInput;
