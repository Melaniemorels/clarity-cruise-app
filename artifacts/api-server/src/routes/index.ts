import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dbRouter from "./db";
import functionsRouter from "./functions";
import restRouter from "./rest";
import mediaRouter from "./media";
import spotifyRouter from "./spotify";
import storageRouter from "./storage";
import pushRouter from "./push";
import sitemapRouter from "./sitemap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sitemapRouter);
router.use(authRouter);
router.use(dbRouter);
router.use(functionsRouter);
router.use(restRouter);
router.use(mediaRouter);
router.use(spotifyRouter);
router.use(storageRouter);
router.use(pushRouter);

export default router;
