const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");

router.get("/users", usersController.listUsers);
router.get("/profiles/:userId", usersController.getProfile);
router.put("/profiles/:userId", usersController.updateProfile);
router.delete("/profiles/:userId", usersController.deleteAccount);

// Skills
router.get("/profiles/:userId/skills", usersController.getSkills);
router.post("/profiles/:userId/skills", usersController.addSkill);
router.delete("/skills/:skillId", usersController.deleteSkill);

module.exports = router;
