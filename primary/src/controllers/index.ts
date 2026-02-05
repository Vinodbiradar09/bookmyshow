import type { Response, Request } from "express";
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import type { User, Artist, Concert, UserLog } from "../lib/types.js";
import bcrypt from "bcrypt";
import { uploadOnCloudinaryBuffer } from "../lib/cloudinary.js";
import { generateAccessAndRefreshTokens, options } from "../lib/tokens.js";
import { redis, luaScripts } from "../redis/index.js";
import { v4 as uuidv4 } from "uuid";
import { paymentSucceeded, reservationCreated } from "../kafka/producer.js";
import { Prisma } from "@prisma/client";

async function deleteByPattern(pattern : string) {
  const stream = redis.scanStream({
    match : pattern,
    count : 100,
  });

  stream.on("data" , async(keys)=>{
    if(keys.length > 0){
      await redis.del(keys);
    }
  });
  return new Promise((resolve)=> stream.on("close" , resolve));
}

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
      user.id,
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

const me = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const sanitizedUser = {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      createdAt: user?.createdAt,
    };
    return res.status(200).json({
      message: "current logged user accessed",
      success: true,
      user: sanitizedUser,
    });
  } catch (error) {
    console.log("failed to access the current logged user", error);
    return res.status(500).json({
      message: "failed to access the current logged user",
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
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { concertId } = req.params;
    const { qty, idempotencyKey } = req.body;

    if (!concertId) {
      return res.status(400).json({
        success: false,
        message: "Concert ID is required",
      });
    }

    if (!qty || qty < 1 || qty > 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket quantity",
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key required",
      });
    }

    const hashTag = `{concert:${concertId}}`;

    const stockKey = `${hashTag}:stock`;
    const reservationId = uuidv4();
    const reservationKey = `${hashTag}:reservation:${reservationId}`;
    const idemKey = `${hashTag}:idempotency:${idempotencyKey}`;

    let cachedConcert = await redis.get(stockKey);

    if (!cachedConcert) {
      const concertFromDb = await prisma.concert.findUnique({
        where: { id: concertId },
        select: {
          id: true,
          totalTickets: true,
          availableTickets: true,
          ticketPrice: true,
        },
      });

      if (!concertFromDb) {
        return res.status(404).json({
          success: false,
          message: "Concert not found",
        });
      }

      await redis.set(stockKey, JSON.stringify(concertFromDb));
      cachedConcert = JSON.stringify(concertFromDb);
    }

    const concert = JSON.parse(cachedConcert);

    const ttl = 300;

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

    const [status, resId] = result as any;

    if (status !== "RESERVED" && status !== "IDEMPOTENT") {
      return res.status(409).json({
        success: false,
        message: "Unable to reserve tickets",
      });
    }

    const totalTicketAmount = concert.ticketPrice * qty;

    let reservation;
    try {
      reservation = await prisma.reservation.create({
        data: {
          id: resId,
          userId: user.id,
          concertId,
          qty,
          ticketAmount: totalTicketAmount,
          expiresAt: new Date(Date.now() + ttl * 1000),
          idempotencyKey,
        },
      });
    } catch (err) {
      await redis.eval(
        luaScripts.releaseTickets,
        2,
        stockKey,
        reservationKey,
        qty
      );

      return res.status(500).json({
        success: false,
        message: "Reservation failed",
      });
    }

    try {
      await reservationCreated({
        reservationId: reservation.id,
        userId: user.id,
        concertId,
        qty,
        expiresAt: reservation.expiresAt.toISOString(),
      });
    } catch (err) {
      console.error("Kafka error", err);
    }

    return res.status(200).json({
      success: true,
      status: "RESERVED",
      reservationId: reservation.id,
      expiresAt: reservation.expiresAt,
      reservation,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        success: false,
        message: "Not enough tickets available",
      });
    }

    if (error?.message === "STOCK_NOT_INITIALIZED") {
      return res.status(500).json({
        success: false,
        message: "Ticket stock not initialized",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



const ticketPayment = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { reservationId } = req.params;
    const { amount } = req.body;
    if (!user) {
      return res.status(401).json({
        message: "unauthorized",
        success: false,
      });
    }
    if (!reservationId || !amount) {
      return res.status(400).json({
        message: "reservationId and amount are required",
        success: false,
      });
    }
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
    });
    if (!reservation) {
      return res.status(404).json({
        message: "reservation not found",
        success: false,
      });
    }
    if (reservation.userId !== user.id) {
      return res.status(404).json({
        message: "user not found , forbidden",
        success: false,
      });
    }
    if (reservation.status === "SETTLED") {
      return res.status(200).json({
        message: "the payment for these tickets are made",
        success: true,
      });
    }
    if (reservation.status !== "ACTIVE") {
      return res.status(404).json({
        message: "the reservation is not active",
        success: false,
      });
    }
    if (reservation.expiresAt < new Date()) {
      return res.status(410).json({
        message: "reservation expired",
        success: false,
      });
    }
    if (amount !== reservation.ticketAmount!) {
      return res.status(402).json({
        message: "please pay valid amount",
        success: false,
      });
    }
    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        status: "ACTIVE",
      },
      data: {
        status: "PAYMENT_PENDING",
      },
    });

    if (updated.count === 0) {
      return res.status(409).json({
        message: "payment already in progress",
        success: false,
      });
    }

    await paymentSucceeded({
      reservationId,
      userId: user.id,
      concertId: reservation.concertId!,
      qty: reservation.qty!,
      ticketAmount: amount,
      idempotencyKey: reservation.idempotencyKey!,
    });
    return res.status(200).json({
      message: "payment received, ticket issuance in progress",
      success: true,
    });
  } catch (error) {
    console.error("payment processing failed", error);
    return res.status(500).json({
      message: "internal server error",
      success: false,
    });
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
    // check the redis first
    const tickets = await redis.get(`concert:${concertId}:stock`);
    console.log("tit" , tickets);
    if (tickets) {
      console.log("titit" , tickets);
      return res.status(200).json({
        message: "the available tickets",
        success: true,
        concert: tickets,
      });
    }
    const concert = await prisma.concert.findUnique({
      where: {
        id: concertId,
      },
      select: {
        id: true,
        totalTickets: true,
        availableTickets: true,
        name : true,
        location : true,
        date : true,
        startTime : true,
        endTime : true,
        ticketPrice : true,
        artist : {
          select : {
            name : true,
          }
        }
      },
    });
    if (!concert) {
      return res.status(404).json({
        message: "no concert found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "successfully found the available tickets",
      success: true,
      concert,
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
    const cache = await redis.get(`concert:${concertId}:det`);
    if (cache) {
      console.log("cache hit" , cache);
      return res.status(200).json({
        message: "successfully got the concert details",
        success: true,
        concert: JSON.parse(cache),
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
    await redis.set(
      `concert:${concertId}:det`,
      JSON.stringify(concert),
      "EX",
      1800,
    );
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
    const cached = await redis.get("concerts:all");
    if (cached) {
      return res.status(200).json({
        message: "concert details from the cache",
        success: false,
        concerts: cached,
      });
    }
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
    if (!concerts.length) {
      return res.status(400).json({
        message: "there are no concerts near to you",
        success: false,
      });
    }
    await redis.set("concerts:all", JSON.stringify(concerts), "EX", 1800);
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

const allArtists = async (req: Request, res: Response) => {
  try {
    const cache = await redis.get(`artists:all`);
    if (cache) {
      return res.status(200).json({
        message: "artist found successfully",
        success: true,
        artists: cache,
      });
    }
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
    await redis.set(`artists:all`, JSON.stringify(artists));
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
    const cache = await redis.get(`artist:${id}:detail`);
    if (cache) {
      return res.status(200).json({
        message: "artist details got successfully",
        success: true,
        artist: JSON.parse(cache),
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
    await redis.set(`artist:${artist.id}:detail`, JSON.stringify(artist));
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

const createConcert = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const body: Concert = req.body;
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null || value === "") {
        return res.status(400).json({
          message: `${key} is required`,
          success: false,
        });
      }
    }
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
    if (!artist) {
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
      file.mimetype,
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
        ...body,
        totalTickets: Number(body.totalTickets),
        availableTickets: Number(body.availableTickets),
        ticketPrice: Number(body.ticketPrice),
        poster: posterUpload.secure_url,
        artistId,
      },
      select : {
        id : true,
        totalTickets : true,
        availableTickets : true,
        name : true,
        location : true,
        date : true,
        startTime : true,
        endTime : true,
        ticketPrice : true,
        artist : {
          select : {
            name : true,
          }
        }
      }
    });
    try {
       const [p1 , p2 , p3 , p4 ] =  await Promise.all([
        await redis.set(`concert:${concert.id}:stock`, (concert.availableTickets)),
        await redis.del("concerts:all"),
        await redis.del("recent:concerts"),
        await deleteByPattern("concerts:filter"),
      ]);
      console.log("p2pp2" , p1 ,p2 , p3 , p4);
    } catch (redisError) {
      // rollback db
      await prisma.concert.delete({
        where: {
          id: concert.id,
        },
      });
      return res.status(500).json({
        message: "failed to initialize concert stock",
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

const delManyConcerts = async (req: Request, res: Response) => {
  const body = req.body;
  if (!Array.isArray(body))
    return res
      .status(411)
      .json({ message: "invalid data structure", success: false });
  const set = new Set(body);
  const id = [...set];
  const count = await prisma.reservation.count({
    where: { id: { in: id } },
  });
  if (count > 0) {
    return res.status(400).json({
      message: "reservation are still active can't delete the concert",
      success: false,
    });
  }
  await prisma.concert.deleteMany({
    where: {
      id: { in: id },
    },
  });
  return res
    .status(200)
    .json({ message: "all the concerts are deleted", success: true });
};

// the below controller is for the future working
const updateConcerts = async (req: Request, res: Response) => {
  const body = req.body;

  if (!Array.isArray(body) || body.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body must be a non-empty array",
    });
  }

  const ids = body
    .filter((c) => c.id)
    .map((c) => `'${c.id}'`)
    .join(",");
  if (!ids.length) {
    return res.status(400).json({ success: false, message: "No valid ids" });
  }

  const sqlCase = (column: string, formatter?: (v: any) => string) => {
    const items = body.filter((c) => c[column] !== undefined);
    if (!items.length) return null;

    const col = column === "ticketPrice" ? `"ticketPrice"` : `"${column}"`;

    const cases = items
      .map((c) => {
        const raw = formatter
          ? formatter(c[column])
          : typeof c[column] === "string"
            ? `'${c[column]}'`
            : c[column];

        return `WHEN '${c.id}' THEN ${raw}`;
      })
      .join(" ");

    return `${col} = CASE id ${cases} ELSE ${col} END`;
  };

  const parts = [
    sqlCase("name"),
    sqlCase("location"),
    sqlCase("date", (v) => `'${new Date(v).toISOString()}'`),
    sqlCase("startTime", (v) => `'${new Date(v).toISOString()}'`),
    sqlCase("endTime", (v) => `'${new Date(v).toISOString()}'`),
    sqlCase("ticketPrice"),
  ].filter(Boolean);

  if (!parts.length) {
    return res.status(400).json({
      success: false,
      message: "No valid fields to update",
    });
  }

  const query = Prisma.sql`
    UPDATE "Concert"
    SET ${Prisma.raw(parts.join(","))}
    WHERE id IN (${Prisma.raw(ids)});
  `;

  try {
    await prisma.$executeRaw(query);

    return res.status(200).json({
      success: true,
      message: "Concerts updated successfully",
    });
  } catch (err: any) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Bulk update failed",
    });
  }
};

const sendTicketsToEmail = async (req: Request, res: Response) => {
  try {
  } catch (error) {}
};

const recentConcerts = async (req: Request, res: Response) => {
  try {
    let concerts;
    concerts = await redis.get("recent:concerts");
    if (concerts) {
      return res.status(200).json({
        message: "cache recent concerts",
        success: true,
        concerts: JSON.parse(concerts),
      });
    }
    concerts = await prisma.concert.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        date: true,
        poster: true,
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10,
    });

    if (concerts.length === 0) {
      return res.status(400).json({
        message: "Zero Recent Concerts",
        success: true,
      });
    }

    await redis.set("recent:concerts", JSON.stringify(concerts), "EX", 1800);

    return res.status(200).json({
      message: "Recent Concerts",
      success: true,
      concerts,
    });
  } catch (error) {
    console.log("error in reading the recent concerts", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

const promotedConcerts = async (req: Request, res: Response) => {
  try {
    let concerts;
    concerts = await redis.get("promoted:concerts");
    if (concerts) {
      return res.status(200).json({
        message: "successfully read the promoted concerts",
        success: true,
        concerts: JSON.parse(concerts),
      });
    }
    concerts = await prisma.concert.findMany({
      where: {
        promoted: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        date: true,
        poster: true,
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (concerts.length === 0) {
      return res.status(204).json({
        message: "there are no promoted concerts",
        success: true,
      });
    }
    await redis.set("promoted:concerts", JSON.stringify(concerts));
    return res.status(200).json({
      message: "Recent Concerts",
      success: true,
      concerts,
    });
  } catch (error) {
    console.log("error in reading the recent concerts", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

const getConcerts = async (req: Request, res: Response) => {
  try {
    const {
      search,
      location,
      promoted,
      date,
      priceMin,
      priceMax,
    } = req.query as Record<string, string>;

    const cacheKey = `concerts:filter:${JSON.stringify(req.query)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log("hey reading from cache");
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return res.status(200).json({
          success: true,
          concerts: parsed,
          cached: true,
        });
      }
    }

    const where: any = {};
    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }
    if (promoted === "true") {
      where.promoted = true;
    }
    const hasPriceMin = priceMin !== undefined;
    const hasPriceMax = priceMax !== undefined;

    if (hasPriceMin || hasPriceMax) {
      where.ticketPrice = {
        not: null,
        ...(hasPriceMin && { gte: Number(priceMin) }),
        ...(hasPriceMax && { lte: Number(priceMax) }),
      };
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end,
      };
    }
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          artist: {
            is: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const concerts = await prisma.concert.findMany({
      where,
      orderBy: [
        { promoted: "desc" },
        { date: "asc" },
      ],
      select: {
        id: true,
        name: true,
        location: true,
        date: true,
        poster: true,
        ticketPrice: true,
        promoted: true,
        artist: {
          select: {
            name: true,
          },
        },
      },
    });

    await redis.set(cacheKey, JSON.stringify(concerts), "EX", 900);

    return res.status(200).json({
      success: true,
      concerts,
    });
  } catch (error) {
    console.error("GET CONCERTS ERROR", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// const getConcertFiltersMeta = async (req: Request, res: Response) => {
//   try {
//     const [locations, prices, promotedCount] = await Promise.all([
//       prisma.concert.groupBy({
//         by: ["location"],
//         _count: { location: true },
//         where: { location: { not: null } },
//       }),
//       prisma.concert.groupBy({
//         by: ["ticketPrice"],
//         _count: { ticketPrice: true },
//         where: { ticketPrice: { not: null } },
//         orderBy: { ticketPrice: "asc" },
//       }),
//       prisma.concert.count({
//         where: { promoted: true },
//       }),
//     ]);
//     return res.status(200).json({
//       success: true,
//       message: "successfully got the counts",
//       filters: {
//         locations,
//         prices,
//         promotedCount,
//       },
//     });
//   } catch (error) {
//     console.error("FILTER META ERROR", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to load filter metadata",
//     });
//   }
// };

export {
  userSignUp,
  userLogin,
  artistLogin,
  ticketBooking,
  availableTickets,
  concertDetails,
  gatherAllConcertDetails,
  allArtists,
  artistDetails,
  currentLoggedUser,
  createConcert,
  ticketPayment,
  delManyConcerts,
  updateConcerts,
  sendTicketsToEmail,
  recentConcerts,
  promotedConcerts,
  getConcerts,
  me,
  // getConcertFiltersMeta,
};
