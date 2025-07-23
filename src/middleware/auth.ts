import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export default async function Auth(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  try {
    // access authorize header to validate request
    const token = req.headers.authorization.split(" ")[1];
    // retrive the user details fo the logged in user
    const decodedToken = await jwt.verify(token, process.env.JWT_ACCESS_KEY!);
    req.user = decodedToken;

    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication Failed!" });
  }
}

export function localVariables(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.app.locals.resetSessions = [];
  next();
}
