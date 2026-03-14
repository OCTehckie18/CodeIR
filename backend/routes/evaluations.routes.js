const express = require("express");
const router = express.Router();
const evaluationsController = require("../controllers/evaluations.controller");

router.post("/evaluate-code", evaluationsController.evaluateCode);
router.post("/evaluations", evaluationsController.upsertEvaluation);
router.post("/auto-grade", evaluationsController.autoGrade);

// Review Comments
router.post("/review-comments", evaluationsController.createReviewComment);
router.get("/review-comments/:submissionId", evaluationsController.getReviewComments);
router.put("/review-comments/:commentId", evaluationsController.updateReviewComment);
router.delete("/review-comments/:commentId", evaluationsController.deleteReviewComment);

module.exports = router;
