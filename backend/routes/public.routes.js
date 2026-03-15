const express = require("express");
const router = express.Router();
const publicController = require("../controllers/public.controller");

// Public (no auth) endpoints for landing page
router.get("/stats", publicController.getPublicStats);
router.get("/testimonials", publicController.getPublicTestimonials);

module.exports = router;
