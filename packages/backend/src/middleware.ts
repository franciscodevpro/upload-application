import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./auth";

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Falha na autenticação" });
  }
};
