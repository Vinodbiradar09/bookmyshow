import { prisma } from "../../primary/dist/src/lib/prisma.js";
import { luaScripts, redis } from "../../primary/dist/src/redis/index.js";
import { producer } from "../../primary/dist/src/kafka/producer.js";
import { generateTicketQRToken } from "../../primary/dist/src/lib/tokens.js";
import QRCode from "qrcode";
import { resend } from "./index.js";
import { base64ToBuffer, emailHTML } from "./extra.js";
import { uploadOnCloudinaryBuffer } from "../../primary/dist/src/lib/cloudinary.js";

export interface Ticket {
  id: string;
  userId: string;
  concertId: string;
  qty: number;
  status: string;
  pricePerTicket: number;
  totalPaid: number;
  idempotencyKey: string;
  confirmedAt: Date;
  createdAt: Date;
}

export const expireReservation = async (
  reservationId: string,
  concertId: string,
  qty: number
) => {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId,
    },
  });
  if (!reservation) {
    return;
  }
  console.log("the reservations is ", reservation);
  if (reservation.status === "SETTLED") return;
  if (reservation.status === "EXPIRED") return;
  await prisma.reservation.update({
    where: {
      id: reservationId,
    },
    data: {
      status: "EXPIRED",
    },
  });
  const stockKey = `concert:${concertId}:stock`;
  const reservationKey = `reservation:${reservationId}`;

  await redis.eval(
    luaScripts.releaseTickets,
    2,
    stockKey,
    reservationKey,
    String(qty)
  );
};

export const paymentCheck = async (
  reservationId: string,
  userId: string,
  concertId: string,
  qty: number,
  ticketAmount: number,
  idempotencyKey: string
) => {
  try {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: {
          id: reservationId,
          userId,
        },
      });
      console.log("reservation of payment check", reservation);
      if (!reservation || reservation.status !== "PAYMENT_PENDING") return;
      const ticket = await tx.ticket.create({
        data: {
          userId,
          concertId,
          qty,
          pricePerTicket: reservation.ticketAmount! / qty,
          totalPaid: ticketAmount,
          status: "CONFIRMED",
          idempotencyKey,
          confirmedAt: new Date(),
        },
      });

      await tx.reservation.update({
        where: {
          id: reservationId,
        },
        data: {
          status: "SETTLED",
          settledAt: new Date(),
        },
      });
      await tx.concert.update({
        where: {
          id: concertId,
        },
        data: {
          availableTickets: {
            decrement: qty,
          },
        },
      });
      const ticketId = ticket.id;
      await producer.send({
        topic: "ticket.issued",
        messages: [
          {
            key: reservationId,
            value: JSON.stringify({ ticketId, userId, ticket }),
          },
        ],
      });
    });
  } catch (error) {
    console.log("payment check failed", error);
  }
};

export const sendTicketToEmail = async (ticket: Ticket) => {
  try {
    const token = await generateTicketQRToken(ticket.id, ticket.userId);
    const scanURL = `http://localhost:3006/api/v2/ticket/scan?token=${token}`;
    const qrBase64 = await QRCode.toDataURL(scanURL);
    const qrBuffer = base64ToBuffer(qrBase64);
    const uploadQR = await uploadOnCloudinaryBuffer(qrBuffer , "image/png");
    if(!uploadQR){
      throw new Error("QR upload failed");
    }
    const qrUrl = uploadQR.secure_url;
    const ticketDetails = await prisma.ticket.findUnique({
      where: {
        id: ticket.id,
      },
      select: {
        concert: {
          select: {
            id: true,
            name: true,
            description: true,
            date : true,
            startTime : true,
            endTime : true,
            location : true,
            poster : true,
            artist: {
              select: {
                name: true,
              },
            },
          },
        },
        totalPaid: true,
        qty: true,
        status: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!ticketDetails || !ticketDetails.concert || !ticketDetails.user)
      throw new Error("Error in fetching ticket details");
    console.log("ticket details", ticketDetails);
    const html = emailHTML(
      ticketDetails.user.name!,
      ticketDetails.user.email,
      ticketDetails.user.phone,
      qrUrl,
      ticketDetails.concert.name!,
      ticketDetails.concert.description!,
      ticketDetails.concert.date,
      ticketDetails.concert.startTime!, 
      ticketDetails.concert.endTime!,
      ticketDetails.concert.location!,
      ticketDetails.concert.poster!,
      ticketDetails.concert.artist?.name!,
      ticketDetails.qty,
      ticketDetails.totalPaid,
      ticketDetails.status
    );
    const { data, error } = await resend.emails.send({
      from: "BookMyShow <vinod@skmayya.me>",
      to: ticketDetails?.user.email,
      subject: "Your Tickets",
      html,
    });

    if (error) {
      throw new Error("Failed to send the tickets to email");
    }
  } catch (error) {
    console.log(" failed to send email", error);
  }
};
