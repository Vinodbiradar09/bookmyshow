import jwt, { type JwtPayload } from "jsonwebtoken";
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";
const verify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("Unauthorized User's request");
    }
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JwtPayload;
    if (!decoded) {
      return res.status(402).json({
        message: "Token Decode Failed",
        success: false,
      });
    }
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found while decoding Token",
        success: false,
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log("error in authmiddleware", error);
    return res.status(403).json({ message: "Invalid token" });
  }
};
export { verify };
