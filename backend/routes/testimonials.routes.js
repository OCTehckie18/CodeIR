const express = require("express");
const router = express.Router();
const testimonialsController = require("../controllers/testimonials.controller");

// Authenticated endpoints
router.get("/testimonials/eligibility", testimonialsController.checkEligibility);
router.get("/testimonials/mine", testimonialsController.getMyTestimonial);
router.post("/testimonials", testimonialsController.submitTestimonial);

module.exports = router;
