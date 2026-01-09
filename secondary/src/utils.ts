import { prisma } from "../../primary/dist/src/lib/prisma.js"
import { luaScripts, redis } from "../../primary/dist/src/redis/index.js";
import { producer } from "../../primary/dist/src/kafka/producer.js";

export const expireReservation = async( reservationId: string, concertId: string, qty: number)=>{
    console.log("ressss" , reservationId);
    const reservation = await prisma.reservation.findUnique({
        where : {
            id : reservationId,
        }
    });
    if(!reservation){
        return;
    }
    console.log("the reservations is " , reservation);
    if(reservation.status === "SETTLED") return;
    if(reservation.status === "EXPIRED") return;
    await prisma.reservation.update({
        where : {
            id : reservationId,
        },data : {
            status : "EXPIRED",
        }
    })
    const stockKey = `concert:${concertId}:stock`;
    const reservationKey = `reservation:${reservationId}`;

    await redis.eval( luaScripts.releaseTickets , 2 , stockKey , reservationKey , String(qty));

    // await producer.send({
    //     topic : "reservation.expired",
    //     messages : [
    //         {
    //             key : reservationId,
    //             value : JSON.stringify({reservationId})
    //         }
    //     ]
    // })

    // await producer.send({
    //     topic : "reservation.released",
    //     messages : [
    //         {
    //             key : concertId,
    //             value : JSON.stringify({concertId , qty}),
    //         }
    //     ]
    // })
}

export const paymentCheck = async(  reservationId : string , userId : string , concertId : string , qty : number, ticketAmount : number , idempotencyKey : string)=>{
    try {
        await prisma.$transaction(async( tx)=>{
            const reservation = await tx.reservation.findUnique({
                where : {
                    id : reservationId,
                    userId,
                }
            })
            if(!reservation || reservation.status !== "PAYMENT_PENDING") return;
            await tx.ticket.create({
                data : {
                    userId,
                    concertId,
                    qty,
                    pricePerTicket : reservation.ticketAmount!/ qty,
                    totalPaid : ticketAmount,
                    status : "CONFIRMED",
                    idempotencyKey,
                    confirmedAt : new Date(),
                }
            })

            await tx.reservation.update({
                where : {
                    id :reservationId,
                },
                data : {
                    status : "SETTLED",
                    settledAt : new Date(),
                }
            })

            await tx.concert.update({
                where : {
                    id : concertId,
                },
                data : {
                    availableTickets : {
                        decrement : qty,
                    }
                }
            })
        
            await producer.send({
                topic : "ticket.issued",
                messages : [
                    {
                        key : reservationId,
                        value : JSON.stringify({reservationId}),
                    }
                ]

            })
        })
    } catch (error) {
        console.log("payment check failed" , error);
    }
}   

