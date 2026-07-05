export default async function handler(req: any, res: any) {
  try {
    const serverModule = await import("../server");
    const app = (serverModule.default || serverModule) as any;
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

