const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const universityController = require('../controllers/universityController');

router.use(authenticate);
router.use(authorizeRoles('UNIVERSITY'));

router.get('/me/dashboard', universityController.getDashboardCounts);
router.get('/me/faculty-students', universityController.getFacultyAndStudents);

module.exports = router;
