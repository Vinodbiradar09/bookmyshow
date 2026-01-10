import jwt from "jsonwebtoken";
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import crypto from "crypto";

const generateAccessToken = async (id: string, email: string) => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const expiry = process.env.ACCESS_TOKEN_EXPIRY;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET missing");
  if (!expiry) throw new Error("ACCESS_TOKEN_EXPIRY missing");
  try {
    return jwt.sign({ id, email }, secret, {
      expiresIn: expiry,
    } as jwt.SignOptions);
  } catch (error) {
    console.log("failed to generate the access tokens", error);
  }
};
const generateRefreshToken = async (id: string) => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  const expiry = process.env.REFRESH_TOKEN_EXPIRY;

  if (!secret) throw new Error("REFRESH_TOKEN_SECRET missing");
  if (!expiry) throw new Error("REFRESH_TOKEN_EXPIRY missing");

  try {
    return jwt.sign({ id }, secret, {
      expiresIn: expiry,
    } as jwt.SignOptions);
  } catch (error) {
    console.log("failed to generate the refresh tokens", error);
  }
};
const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new Error("user not found");
    }
    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id);
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokens: refreshToken!,
      },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("error in generating the tokens", error);
    throw new Error("error in generating the tokens");
  }
};

export const signAccessToken = (payload: {
  id: string;
  tokenVersion: number;
}) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions);
};

export const signRefreshToken = (payload: {
  id: string;
  tokenVersion: number;
}) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  } as jwt.SignOptions);
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateTicketQRToken = async (
  ticketId: string,
  userId: string
) => {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    include : {
      concert : {
        select : {
          endTime : true,
          date : true,
        }
      }
    }
  });

  if(!ticket?.concert) {
    throw new Error("Ticket or concert not found");
  }
  const { date , endTime } = ticket.concert;
  const concertEndAt = buildConcertEndAt(date! , endTime!);
  const now = Date.now();
  const expiresAtMs = concertEndAt.getTime();

  if (expiresAtMs <= now) {
    throw new Error("Concert already ended");
  }
   const expiresInSeconds = Math.floor(
    (expiresAtMs - now) / 1000
  );

  const QR_SECRET = process.env.QR_SECRET!;
  const token = jwt.sign({ ticketId, userId, type: "TICKET_QR" }, QR_SECRET , {expiresIn : expiresInSeconds});

  return token;
};

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

function buildConcertEndAt(date: Date, endTime: Date) {
  const endAt = new Date(date);

  endAt.setHours(
    endTime.getHours(),
    endTime.getMinutes(),
    endTime.getSeconds(),
    0
  );

  return endAt;
}


export {
  generateAccessToken,
  generateRefreshToken,
  generateAccessAndRefreshTokens,
  options,
};
