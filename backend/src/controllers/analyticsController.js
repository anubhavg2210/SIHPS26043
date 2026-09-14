"use strict";

const analyticsService = require("../services/analyticsService");

const getOverviewHandler = async (req, res, next) => {
    try {
        const data = await analyticsService.getOverview();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getPipelineHandler = async (req, res, next) => {
    try {
        const data = await analyticsService.getPipeline();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getCommunityHandler = async (req, res, next) => {
    try {
        const data = await analyticsService.getCommunity();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getTrustHandler = async (req, res, next) => {
    try {
        const data = await analyticsService.getTrust();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOverviewHandler,
    getPipelineHandler,
    getCommunityHandler,
    getTrustHandler
};
