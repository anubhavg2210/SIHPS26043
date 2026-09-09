const STATUS_FLOW = {
    REPORTED: ["UNDER_REVIEW"],

    UNDER_REVIEW: [
        "VERIFIED",
        "REPORTED"
    ],

    VERIFIED: [
        "ASSIGNED"
    ],

    ASSIGNED: [
        "ROOT_CAUSE_ANALYSIS",
        "SOLUTION_SEARCH"
    ],

    ROOT_CAUSE_ANALYSIS: [
        "SOLUTION_SEARCH"
    ],

    SOLUTION_SEARCH: [
        "SOLUTION_EVALUATION"
    ],

    SOLUTION_EVALUATION: [
        "APPROVED",
        "SOLUTION_SEARCH"
    ],

    APPROVED: [
        "PILOT"
    ],

    PILOT: [
        "IMPLEMENTING",
        "SOLUTION_SEARCH"
    ],

    IMPLEMENTING: [
        "RESOLVED"
    ],

    RESOLVED: [
        "MONITORING"
    ],

    MONITORING: [
        "SUSTAINED",
        "IMPLEMENTING"
    ],

    SUSTAINED: []
};

function isValidTransition(currentStatus, newStatus) {
    return STATUS_FLOW[currentStatus]?.includes(newStatus) || false;
}

module.exports = {
    STATUS_FLOW,
    isValidTransition
};