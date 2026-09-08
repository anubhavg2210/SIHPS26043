const express = require("express");

const {
    createChallenge
} = require("../controllers/challengeController");

const router = express.Router();

router.post("/", createChallenge);

module.exports = router;