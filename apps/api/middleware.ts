import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_PUBLIC_KEY } from "./config";
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization'] 
  
    if(!token) {
      return res.status(401).json({
        error: 'Unauthorized'
      })
    }
    
    const secret = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n')        
    .replace(/\r/g, '')            
    .trim();

    const decoded = jwt.verify(token, secret!)
    console.log(decoded);
    if(!decoded || !decoded.sub) {
        return res.status(401).json({
            error: "Unauthorized"
        })
    }

    req.userId = decoded.sub as string;
    next();
}
