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
        defence: Float
        landed: Int
        landedPerMinute: Float
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
        attemptsPer15Mins: Float
        average: Float
    }

    input TakedownInput {
        accuracy: Float
        attempted: Int
        avgTakedownsLandedPerMin: Float
        defence: Float
        landed: Int
    }
`;

export default fightStatsInput;
