/**
 * impactController.js
 *
 * MODULE 10 — IMPACT TRACKING CONTROLLER
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    createImpactAssessment,
    getImpactAssessmentByImplementation,
    getImpactAssessmentById,
    updateImpactAssessment,
    addMetric,
    updateMetric,
    getBeforeAfterComparison,
    submitCitizenFeedback,
    getCitizenFeedback,
    verifyImpactAssessment,
    markSustainedOutcome,
    getProblemImpactSummary,
    addEvidence,
    getEvidence,
    verifyEvidence,
} = require("../services/impactService");

function handleError(error, res, fallbackMessage) {
    if (error instanceof ValidationError || error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
    }
    if (error instanceof ForbiddenError || error.name === "ForbiddenError") {
        return res.status(403).json({ message: error.message });
    }
    if (error instanceof NotFoundError || error.name === "NotFoundError") {
        return res.status(404).json({ message: error.message });
    }
    if (error instanceof ConflictError || error.name === "ConflictError") {
        return res.status(409).json({ message: error.message });
    }

    console.error(fallbackMessage, error);
    res.status(500).json({ message: fallbackMessage });
}

// POST /api/implementations/:id/impact
async function createImpactAssessmentHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const assessment = await createImpactAssessment({
            implementationId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Impact assessment initiated successfully",
            assessment,
        });
    } catch (err) {
        handleError(err, res, "Failed to initiate impact assessment");
    }
}

// GET /api/implementations/:id/impact
async function getImpactAssessmentByImplementationHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const assessment = await getImpactAssessmentByImplementation(implementationId);
        res.json({ assessment });
    } catch (err) {
        handleError(err, res, "Failed to fetch impact assessment");
    }
}

// GET /api/impact-assessments/:id
async function getImpactAssessmentHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const assessment = await getImpactAssessmentById(id);
        res.json({ assessment });
    } catch (err) {
        handleError(err, res, "Failed to fetch impact assessment");
    }
}

// PATCH /api/impact-assessments/:id
async function updateImpactAssessmentHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const assessment = await updateImpactAssessment({
            id,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Impact assessment updated successfully",
            assessment,
        });
    } catch (err) {
        handleError(err, res, "Failed to update impact assessment");
    }
}

// POST /api/impact-assessments/:id/metrics
async function addMetricHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const metric = await addMetric({
            assessmentId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Impact metric added successfully",
            metric,
        });
    } catch (err) {
        handleError(err, res, "Failed to add impact metric");
    }
}

// PATCH /api/impact-assessments/:id/metrics/:mId
async function updateMetricHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    const metricId = parseInt(req.params.mId, 10);

    if (isNaN(assessmentId) || isNaN(metricId)) {
        return res.status(400).json({ message: "Invalid assessment or metric id" });
    }

    try {
        const metric = await updateMetric({
            assessmentId,
            metricId,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Impact metric updated successfully",
            metric,
        });
    } catch (err) {
        handleError(err, res, "Failed to update impact metric");
    }
}

// GET /api/impact-assessments/:id/comparison
async function getComparisonHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const result = await getBeforeAfterComparison(assessmentId);
        res.json(result);
    } catch (err) {
        handleError(err, res, "Failed to fetch comparison");
    }
}

// POST /api/impact-assessments/:id/feedback
async function submitFeedbackHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const feedback = await submitCitizenFeedback({
            assessmentId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Citizen feedback submitted successfully",
            feedback,
        });
    } catch (err) {
        handleError(err, res, "Failed to submit feedback");
    }
}

// GET /api/impact-assessments/:id/feedback
async function getFeedbackHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const feedback = await getCitizenFeedback(assessmentId);
        res.json({ impact_assessment_id: assessmentId, total: feedback.length, feedback });
    } catch (err) {
        handleError(err, res, "Failed to fetch feedback");
    }
}

// PATCH /api/impact-assessments/:id/verify
async function verifyHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const assessment = await verifyImpactAssessment({
            assessmentId,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Impact assessment verification updated successfully",
            assessment,
        });
    } catch (err) {
        handleError(err, res, "Failed to verify impact assessment");
    }
}

// PATCH /api/impact-assessments/:id/sustained
async function markSustainedHandler(req, res) {
    const assessmentId = parseInt(req.params.id, 10);
    if (isNaN(assessmentId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const assessment = await markSustainedOutcome({
            assessmentId,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Outcome marked as sustained successfully",
            assessment,
        });
    } catch (err) {
        handleError(err, res, "Failed to mark outcome as sustained");
    }
}

// GET /api/problems/:id/impact-summary
async function getProblemImpactSummaryHandler(req, res) {
    const problemId = parseInt(req.params.id, 10);
    if (isNaN(problemId)) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const result = await getProblemImpactSummary(problemId);
        res.json(result);
    } catch (err) {
        handleError(err, res, "Failed to fetch problem impact summary");
    }
}

// ---------------------------------------------------------------------------
// POST /api/impact-assessments/:id/evidence
// ---------------------------------------------------------------------------
async function addEvidenceHandler(req, res) {
    const impactId = parseInt(req.params.id, 10);
    if (isNaN(impactId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const evidence = await addEvidence({
            impactId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Impact evidence submitted successfully",
            evidence,
        });
    } catch (err) {
        handleError(err, res, "Failed to submit impact evidence");
    }
}

// ---------------------------------------------------------------------------
// GET /api/impact-assessments/:id/evidence
// ---------------------------------------------------------------------------
async function getEvidenceHandler(req, res) {
    const impactId = parseInt(req.params.id, 10);
    if (isNaN(impactId)) {
        return res.status(400).json({ message: "Invalid impact assessment id" });
    }

    try {
        const evidence = await getEvidence(impactId);
        res.json({ impact_assessment_id: impactId, total: evidence.length, evidence });
    } catch (err) {
        handleError(err, res, "Failed to fetch impact evidence");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/impact-assessments/:id/evidence/:evidenceId/verify
// ---------------------------------------------------------------------------
async function verifyEvidenceHandler(req, res) {
    const impactId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);
    
    if (isNaN(impactId) || isNaN(evidenceId)) {
        return res.status(400).json({ message: "Invalid impact assessment or evidence id" });
    }

    try {
        const evidence = await verifyEvidence({
            impactId,
            evidenceId,
            user: req.user,
            status: req.body?.status,
            remarks: req.body?.remarks,
        });

        res.json({
            message: `Impact evidence ${req.body?.status} successfully`,
            evidence,
        });
    } catch (err) {
        handleError(err, res, "Failed to verify impact evidence");
    }
}

module.exports = {
    createImpactAssessmentHandler,
    getImpactAssessmentByImplementationHandler,
    getImpactAssessmentHandler,
    updateImpactAssessmentHandler,
    addMetricHandler,
    updateMetricHandler,
    getComparisonHandler,
    submitFeedbackHandler,
    getFeedbackHandler,
    verifyHandler,
    markSustainedHandler,
    getProblemImpactSummaryHandler,
    addEvidenceHandler,
    getEvidenceHandler,
    verifyEvidenceHandler,
};
