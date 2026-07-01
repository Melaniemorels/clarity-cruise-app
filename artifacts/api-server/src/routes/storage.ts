import {
  Router,
  type IRouter,
  type Request,
  type Response,
  raw,
} from "express";
import { Readable } from "stream";
import { objectStorageClient } from "../lib/objectStorage";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// Allowlisted storage buckets (mirrors the Supabase storage buckets used by
// the client). Objects live under PRIVATE_OBJECT_DIR/vyv/<bucket>/<path>.
const ALLOWED_BUCKETS = new Set(["images", "quick-captures"]);

function getPrivateDir(): { bucketName: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  const trimmed = dir.startsWith("/") ? dir.slice(1) : dir;
  const [bucketName, ...rest] = trimmed.split("/");
  return { bucketName, prefix: rest.join("/") };
}

function objectName(bucket: string, path: string): string {
  const { prefix } = getPrivateDir();
  const clean = path.replace(/^\/+/, "");
  return `${prefix ? prefix + "/" : ""}vyv/${bucket}/${clean}`;
}

// All client upload paths are prefixed with the caller's user id
// (`${user.id}/...`). Enforce that on writes/deletes so an authenticated user
// can only ever touch their own objects (prevents cross-user IDOR delete/overwrite).
function ownsPath(userId: string, path: string): boolean {
  const clean = path.replace(/^\/+/, "");
  return clean === userId || clean.startsWith(`${userId}/`);
}

// POST /api/storage/:bucket/upload?path=<path>  (raw file bytes in body)
router.post(
  "/storage/:bucket/upload",
  requireUser,
  raw({ type: "*/*", limit: "25mb" }),
  async (req: Request, res: Response): Promise<void> => {
    const bucket = String(req.params.bucket);
    const path = String(req.query.path ?? "");
    if (!ALLOWED_BUCKETS.has(bucket) || !path) {
      res.status(400).json({ error: { message: "Invalid bucket or path" } });
      return;
    }
    if (!ownsPath(req.authUser!.id, path)) {
      res.status(403).json({ error: { message: "Forbidden: path not owned" } });
      return;
    }
    try {
      const { bucketName } = getPrivateDir();
      const file = objectStorageClient
        .bucket(bucketName)
        .file(objectName(bucket, path));
      const contentType =
        (req.headers["content-type"] as string) || "application/octet-stream";
      await file.save(req.body as Buffer, {
        contentType,
        metadata: { cacheControl: "public, max-age=3600" },
      });
      res.json({ data: { path }, error: null });
    } catch (err) {
      req.log?.error({ err }, "storage upload failed");
      res
        .status(500)
        .json({ error: { message: err instanceof Error ? err.message : "Upload failed" } });
    }
  },
);

// GET /api/storage/:bucket/serve/*  -> streams the object (public)
router.get(
  "/storage/:bucket/serve/*splat",
  async (req: Request, res: Response): Promise<void> => {
    const bucket = String(req.params.bucket);
    const splat = (req.params as Record<string, string | string[]>).splat;
    const path = Array.isArray(splat) ? splat.join("/") : String(splat ?? "");
    if (!ALLOWED_BUCKETS.has(bucket)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      const { bucketName } = getPrivateDir();
      const file = objectStorageClient
        .bucket(bucketName)
        .file(objectName(bucket, path));
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const [metadata] = await file.getMetadata();
      res.setHeader(
        "Content-Type",
        (metadata.contentType as string) || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
      const stream = file.createReadStream();
      Readable.from(stream).pipe(res);
    } catch (err) {
      req.log?.error({ err }, "storage serve failed");
      res.status(500).json({ error: "Serve failed" });
    }
  },
);

// POST /api/storage/:bucket/remove  { paths: string[] }
router.post(
  "/storage/:bucket/remove",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const bucket = String(req.params.bucket);
    const paths: string[] = req.body?.paths ?? [];
    if (!ALLOWED_BUCKETS.has(bucket)) {
      res.status(400).json({ error: { message: "Invalid bucket" } });
      return;
    }
    if (!paths.every((p) => ownsPath(req.authUser!.id, p))) {
      res.status(403).json({ error: { message: "Forbidden: path not owned" } });
      return;
    }
    try {
      const { bucketName } = getPrivateDir();
      await Promise.all(
        paths.map((p) =>
          objectStorageClient
            .bucket(bucketName)
            .file(objectName(bucket, p))
            .delete({ ignoreNotFound: true }),
        ),
      );
      res.json({ data: paths.map((p) => ({ name: p })), error: null });
    } catch (err) {
      req.log?.error({ err }, "storage remove failed");
      res
        .status(500)
        .json({ error: { message: err instanceof Error ? err.message : "Remove failed" } });
    }
  },
);

export default router;
