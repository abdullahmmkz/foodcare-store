// Vercel Serverless Function - Express API Handler
import express from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// Dynamic import to handle ESM
let appInstance = null;

async function getApp() {
  if (appInstance) return appInstance;

  const { appRouter } = await import("../dist/index.js");
  const { createContext } = await import("../dist/context.js");

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  appInstance = app;
  return app;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
