// Vercel Serverless Function Entry Point
// This file proxies all /api/* requests to the Express server

import { createServer } from "../dist/index.js";

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await createServer();
  }
  return app(req, res);
}
