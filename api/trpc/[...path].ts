import "dotenv/config";
import type { Request, Response } from "express";
import { serialize } from "cookie";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appRouter } from "../../server/routers";
import { getAdminUser } from "../../server/_core/localAuth";
import type { TrpcContext } from "../../server/_core/context";

function createVercelContext(req: IncomingMessage, res: ServerResponse): TrpcContext {
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ?? "http";
  const expressRequest = Object.assign(req, { protocol }) as unknown as Request;
  const expressResponse = res as unknown as Response;

  expressResponse.cookie = (name, value, options) => {
    const serialized = serialize(name, String(value), options);
    const existing = res.getHeader("Set-Cookie");
    const cookies = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
    res.setHeader("Set-Cookie", [...cookies, serialized]);
    return expressResponse;
  };
  expressResponse.clearCookie = (name, options) => {
    expressResponse.cookie(name, "", { ...options, maxAge: 0 });
    return expressResponse;
  };

  return {
    req: expressRequest,
    res: expressResponse,
    user: null,
  } as TrpcContext;
}

export default createHTTPHandler({
  router: appRouter,
  basePath: "/api/trpc/",
  createContext: async ({ req, res }) => ({
    ...createVercelContext(req, res),
    user: await getAdminUser(req as unknown as Request),
  }),
});
