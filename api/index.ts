import app from "../server";

export default async function handler(req: any, res: any) {
  try {
    if (req.query && req.query.debug === "1") {
      return res.status(200).json({
        url: req.url,
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method,
        headers: req.headers,
        query: req.query
      });
    }
    return app(req, res);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Vercel Serverless Function Runtime/Initialization Error",
      error: err.message,
      stack: err.stack,
    });
  }
}

