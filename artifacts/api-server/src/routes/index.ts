import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dbRouter from "./db";
import functionsRouter from "./functions";
import restRouter from "./rest";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dbRouter);
router.use(functionsRouter);
router.use(restRouter);
router.use(storageRouter);

export default router;
