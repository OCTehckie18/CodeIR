const express = require("express");
const router = express.Router();
const submissionsController = require("../controllers/submissions.controller");

// Problems
router.post("/problems", submissionsController.createProblem);
router.get("/problems", submissionsController.getProblems);
router.get("/problems/:id", submissionsController.getProblemById);
router.put("/problems/:id", submissionsController.updateProblem);
router.delete("/problems/:id", submissionsController.deleteProblem);

// Submissions
router.post("/submissions", submissionsController.createSubmission);
router.put("/submissions/:id", submissionsController.updateSubmission);
router.delete("/submissions/:id", submissionsController.deleteSubmission);
router.get("/submissions/:submissionId", submissionsController.getSubmissionForEvaluation);

// Dashboards & Drafts
router.get("/dashboard/:userId", submissionsController.getStudentDashboard);
router.get("/drafts/:userId", submissionsController.getDraft);
router.get("/instructor/dashboard", submissionsController.getInstructorDashboard);

module.exports = router;
