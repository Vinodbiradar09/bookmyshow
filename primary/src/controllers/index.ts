import type { Response, Request } from "express";
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import type { User, Artist, Concert, UserLog } from "../lib/types.js";
import bcrypt from "bcrypt";
import { uploadOnCloudinaryBuffer } from "../lib/cloudinary.js";
import { generateAccessAndRefreshTokens, options } from "../lib/tokens.js";
import { redis, luaScripts } from "../redis/index.js";
import { v4 as uuidv4 } from "uuid";
import { reservationCreated } from "../kafka/producer.js";
const userSignUp = async (req: Request, res: Response) => {
  try {
    const body: User = req.body;
    (Object.keys(body) as (keyof User)[]).forEach((key) => {
      if (key === "name") return;
      if (!body[key] || body[key] === undefined || body[key] === null) {
        return res.status(400).json({
          message: `${key}'s value is empty please send the correct details`,
          success: false,
        });
      }
    });
    const existingUser = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });
    if (existingUser || existingUser != undefined) {
      return res.status(411).json({
        message: "user with this email already exists",
        success: false,
      });
    }
    if (body.phone.toString().length != 10) {
      return res.json({
        message: `${body.phone} is not a correct number please enter a valid number`,
        success: false,
      });
    }
    const password = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: password,
        name: body.name!,
        phone: body.phone,
      },
    });
    if (!user || user === undefined || user === null) {
      return res.status(400).json({
        message: "failed to create a user",
        success: false,
      });
    }
    return res.status(200).json({
      message: "User created successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.log("internal server error , failed to sign up user", error);
    return res.status(500).json({
      message: "internal server error , failed to sign up user",
      success: false,
    });
  }
};
const userLogin = async (req: Request, res: Response) => {
  try {
    const body: UserLog = req.body;
    (Object.keys(body) as (keyof UserLog)[]).forEach((key) => {
      if (!body[key] || body[key] === undefined || body[key] === null) {
        return res.status(400).json({
          message: `${key}'s value is empty please send the correct details`,
          success: false,
        });
      }
    });
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "user with this email not found",
        success: false,
      });
    }
    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "invalid details",
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id
    );
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({ message: "user logged in successfully", success: true, user });
  } catch (error) {
    console.log("internal server error while logging", error);
    return res.status(500).json({
      message: "internal server error while logging",
      success: false,
    });
  }
};
const artistLogin = async (req: Request, res: Response) => {
  try {
    const body: Artist = req.body;
    (Object.keys(body) as (keyof Artist)[]).forEach((key) => {
      if (!body[key] || body[key] === undefined || body[key] === null) {
        return res.status(400).json({
          message: `${key}'s value is empty please provide correct details`,
          success: false,
        });
      }
    });
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "file not found",
        success: false,
      });
    }
    const existingArtist = await prisma.artist.findUnique({
      where: {
        email: body.email,
      },
    });
    if (existingArtist || existingArtist != undefined) {
      return res.status(411).json({
        message: "Artist with this email already exists",
        success: false,
      });
    }
    const uploaded = await uploadOnCloudinaryBuffer(file.buffer, file.mimetype);
    if (!uploaded) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to Cloudinary",
      });
    }
    const artist = await prisma.artist.create({
      data: {
        name: body.name,
        bio: body.bio,
        image: uploaded.secure_url,
        email: body.email,
      },
    });

    if (!artist || artist === undefined || artist === null) {
      return res.status(400).json({
        message: "failed to create artist",
        success: false,
      });
    }

    return res.status(200).json({
      message: "artist created successfully",
      success: true,
      artist,
    });
  } catch (error) {
    console.log("image", req.body.image);
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error failed to create artist",
      success: false,
    });
  }
};
const ticketBooking = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    const { concertId } = req.params;
    const { qty, idempotencyKey } = req.body;

    if (!concertId) {
      return res
        .status(400)
        .json({ message: "Concert ID is required", success: false });
    }

    if (!qty || qty < 1 || qty > 10) {
      return res
        .status(400)
        .json({ message: "Invalid ticket count", success: false });
    }

    if (!idempotencyKey) {
      return res
        .status(400)
        .json({ message: "Idempotency key is required", success: false });
    }

    const validConcert = await prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!validConcert ) {
      return res
        .status(404)
        .json({ message: "Concert not found", success: false });
    }

    const reservationId = uuidv4();
    const ttl = 300;

    const stockKey = `concert:${concertId}:stock`;
    const reservationKey = `reservation:${reservationId}`;
    const idemKey = `idempotency:${idempotencyKey}`;
    const result = await redis.eval(
      luaScripts.reserveTickets,
      3,
      stockKey,
      reservationKey,
      idemKey,
      qty,
      reservationId,
      user.id,
      concertId,
      ttl
    );
    // if (result && result.err) {
    //   return res.status(409).json({ message: result, success: false });
    // }

    const [status, resId] = result as any;
    if (status !== "RESERVED" && status !== "IDEMPOTENT") {
      return res
        .status(409)
        .json({ message: "Unable to reserve tickets", success: false });
    }
    let reservation;
    try {
      reservation = await prisma.reservation.create({
        data: {
          id: resId,
          userId: user.id,
          concertId,
          qty,
          expiresAt: new Date(Date.now() + ttl * 1000),
          idempotencyKey,
        },
      });
    } catch (dbErr) {
      console.error("DB reservation creation failed", dbErr);
      await redis.eval(
        luaScripts.releaseTickets,
        2,
        stockKey,
        reservationKey,
        qty
      );
      return res
        .status(500)
        .json({ message: "Reservation failed", success: false });
    }
    try {
      await reservationCreated({
        reservationId: reservation.id,
        userId: user.id,
        concertId,
        qty,
      });
    } catch (kafkaErr) {
      console.error("Kafka produce failed", kafkaErr);
    }

    return res.status(200).json({
      reservationId: reservation.id,
      expiresAt: reservation.expiresAt,
      status: "RESERVED",
      success: true,
      message: "Tickets reserved successfully",
    });
  } catch (error) {
    console.error("Internal server error", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};
const availableTickets = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ message: "unauthorized user", success: false });
    const { concertId } = req.params;
    if (!concertId) {
      return res.status(400).json({
        message: "concertId is required to find the available tickets",
        success: false,
      });
    }
    const tickets = await prisma.concert.findUnique({
      where: {
        id: concertId,
      },
      select: {
        id: true,
        totalTickets: true,
        availableTickets: true,
      },
    });
    if (!tickets) {
      return res.status(404).json({
        message: "no concert found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "successfully found the available tickets",
      success: true,
      tickets,
    });
  } catch (error) {
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error",
      success: false,
    });
  }
};
const concertDetails = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ message: "unauthorized user", success: false });
    const { concertId } = req.params;
    if (!concertId) {
      return res.status(400).json({
        message: "concert not found",
        success: false,
      });
    }
    const concert = await prisma.concert.findUnique({
      where: {
        id: concertId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        date: true,
        startTime: true,
        endTime: true,
        totalTickets: true,
        availableTickets: true,
        ticketPrice: true,
        poster: true,
        artist: {
          select: {
            id: true,
            name: true,
            bio: true,
            image: true,
          },
        },
      },
    });
    if (!concert) {
      return res.status(404).json({
        message: "concert not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "successfully got the concert details",
      success: true,
      concert,
    });
  } catch (error) {
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error while getting the concert details",
      success: false,
    });
  }
};
const gatherAllConcertDetails = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ message: "unauthorized user", success: false });
    const concerts = await prisma.concert.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        date: true,
        totalTickets: true,
        availableTickets: true,
        poster: true,
        artist: {
          select: {
            name: true,
            bio: true,
            image: true,
          },
        },
      },
    });
    if (!concerts || concerts.length === 0) {
      return res.status(400).json({
        message: "there are no concerts near to you",
        success: false,
      });
    }
    return res.status(200).json({
      message: "all the concerts",
      success: true,
      concerts,
    });
  } catch (error) {
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error",
      success: false,
    });
  }
};
const createConcert = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const body: Concert = req.body;
    (Object.keys(body) as (keyof Concert)[]).forEach((key) => {
      if (!body[key] || body[key] === undefined || body[key] === null) {
        return res.status(400).json({
          message: `${key}'s value is empty please fill the correct details`,
          success: false,
        });
      }
    });
    if (!artistId) {
      return res.status(400).json({
        message: "artist slug is required",
        success: false,
      });
    }

    const artist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },
    });
    if (!artist || artist === undefined || artist === null) {
      return res.status(404).json({
        message: "artist not found",
        success: false,
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "poster is required to create a concert",
        success: false,
      });
    }

    const posterUpload = await uploadOnCloudinaryBuffer(
      file.buffer,
      file.mimetype
    );
    if (!posterUpload) {
      return res.status(400).json({
        message: "poster upload failed",
        success: false,
      });
    }
    if (body.totalTickets !== body.availableTickets) {
      return res.status(400).json({
        message:
          "the total tickets and available tickets should be same while creating the concert",
        success: false,
      });
    }
    const concert = await prisma.concert.create({
      data: {
        name: body.name,
        description: body.description,
        location: body.location,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        totalTickets: Number(body.totalTickets),
        availableTickets: Number(body.availableTickets),
        ticketPrice: Number(body.ticketPrice),
        poster: posterUpload.secure_url,
        artistId,
      },
    });
    try {
      await redis.set(`concert:${concert.id}:stock`, concert.totalTickets);
    } catch (error) {
      await prisma.concert.delete({ where: { id: concert.id } });
      return res.status(500).json({
        message: "failed to initialize concert stock",
        success: false,
      });
    }

    if (!concert || concert === undefined || concert === null) {
      return res.status(400).json({
        message: "failed to create a concert",
        success: false,
      });
    }

    return res.status(200).json({
      message: "concert created successfully",
      success: true,
      concert,
    });
  } catch (error) {
    console.log("failed to create concert", error);
    return res.status(500).json({
      message: "internal server error failed to create concert",
      success: false,
    });
  }
};
const allArtists = async (req: Request, res: Response) => {
  try {
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
      },
    });
    if (!artists || artists.length === 0) {
      return res.status(400).json({
        message: "no artist found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "artists found successfully",
      success: true,
      artists,
    });
  } catch (error) {
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error",
      success: false,
    });
  }
};
const artistDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "slug required",
        success: false,
      });
    }
    const artist = await prisma.artist.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
      },
    });
    if (!artist || artist === undefined || artist === null) {
      return res.status(404).json({
        message: "artist not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "artist found successfully",
      success: true,
      artist,
    });
  } catch (error) {
    console.log("internal server error", error);
    return res.status(500).json({
      message: "internal server error",
      success: false,
    });
  }
};
const currentLoggedUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    return res
      .status(200)
      .json({ message: "current logged user accessed", success: true, user });
  } catch (error) {
    console.log("failed to access the current logged user", error);
    return res.status(500).json({
      message: "failed to access the current logged user",
      success: false,
    });
  }
};
export {
  userSignUp,
  userLogin,
  artistLogin,
  ticketBooking,
  availableTickets,
  concertDetails,
  gatherAllConcertDetails,
  createConcert,
  allArtists,
  artistDetails,
  currentLoggedUser,
};
