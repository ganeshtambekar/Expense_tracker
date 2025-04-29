const { Router } = require("express");
const expenseRouter = require("./expenseRoutes");
const userRouter = require("./userRoutes");
const mailer=require("./mailer");
const router = Router();

router.use("/user", userRouter);
router.use("/expense", expenseRouter);
router.use("/send",mailer);
module.exports = router;
