import app from "../server";

export default async function handler(req: any, res: any) {
  try {
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

