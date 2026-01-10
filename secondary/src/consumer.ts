import { prisma } from "../..//primary/dist/src/lib/prisma.js";
import { kafka } from "../../primary/dist/src/kafka/client.js";
import { expireReservation, paymentCheck, sendTicketToEmail } from "./utils.js";

const reservationConsumer = kafka.consumer({ groupId: "secondary-service" });
const paymentConsumer = kafka.consumer({ groupId: "payment-service" });
const ticketConsumer = kafka.consumer({groupId : "ticket-service"});

const reservationCreatedConsumer = async () => {
  try {
    await reservationConsumer.subscribe({
      topics: ["reservation.created"],
      fromBeginning: true,
    });
    await reservationConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const playload = JSON.parse(message.value?.toString());
        const { reservationId, userId, concertId, qty, expiresAt } = playload;
        console.log("hey", reservationId, userId, concertId, qty, expiresAt);
        const delay = new Date(expiresAt).getTime() - Date.now();
        if (delay < 0) {
          console.log("already expired");
          await expireReservation(reservationId, concertId, qty);
          return;
        }
        console.log("delay", delay);
        setTimeout(async () => {
          console.log("the delay is of", delay);
          const reservation = await prisma.reservation.findUnique({
            where: {
              id: reservationId,
            },
          });
          if (reservation?.status === "SETTLED") return;
          await expireReservation(reservationId, concertId, qty);
        }, delay);
      },
    });
  } catch (error) {
    console.log(
      "error in the consumer consuming the message reservationCreatedConsumer",
      error
    );
  }
};

const paymentSucceededConsumer = async () => {
  try {
    await paymentConsumer.subscribe({
      topics: ["payment.succeeded"],
      fromBeginning: true,
    });
    await paymentConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const playload = JSON.parse(message.value.toString());
        const {
          reservationId,
          userId,
          concertId,
          qty,
          ticketAmount,
          idempotencyKey,
        } = playload;
        console.log(
          "payment",
          reservationId,
          userId,
          ticketAmount,
          concertId,
          idempotencyKey,
          qty
        );
        await paymentCheck(
          reservationId,
          userId,
          concertId,
          qty,
          ticketAmount,
          idempotencyKey
        );
        console.log("payment done");
      },
    });
  } catch (error) {
    console.log("error in the consumer of payment succeeded", error);
  }
};

const ticketIssued = async()=>{
  try {
    await ticketConsumer.subscribe({
      topics : ["ticket.issued"],
      fromBeginning : true,
    })
    await ticketConsumer.run({
      eachMessage : async({ message })=>{
        if(!message.value) return;
        const playload = JSON.parse(message.value.toString());
        const { ticketId , userId , ticket } = playload;
        console.log(" ticketId" , ticketId , userId , ticket);
        sendTicketToEmail(ticket);
      }
    })
  } catch (error) {
    console.log("error in ticketIssued consumer" , error);
  }
}

export { reservationCreatedConsumer, paymentSucceededConsumer , ticketIssued };
