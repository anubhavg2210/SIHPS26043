function calculatePriority({
    severity = 1,
    affectedPeople = 0,
    recurrence = 0,
    dependencyImportance = 0,
    daysUnresolved = 0
}) {
    const severityScore = severity * 10;

    const affectedScore = Math.min(
        affectedPeople / 100,
        20
    );

    const recurrenceScore = Math.min(
        recurrence * 5,
        20
    );

    const dependencyScore = Math.min(
        dependencyImportance * 5,
        15
    );

    const unresolvedScore = Math.min(
        daysUnresolved / 2,
        15
    );

    const total =
        severityScore +
        affectedScore +
        recurrenceScore +
        dependencyScore +
        unresolvedScore;

    return Math.min(
        Math.round(total),
        100
    );
}

module.exports = {
    calculatePriority
};