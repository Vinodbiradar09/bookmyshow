import { prisma } from "../../primary/dist/src/lib/prisma.js"
import { luaScripts, redis } from "../../primary/dist/src/redis/index.js";
import { producer } from "../../primary/dist/src/kafka/producer.js";
export const expireReservation = async( reservationId: string, concertId: string, qty: number)=>{
    const reservation = await prisma.reservation.findUnique({where : { id : reservationId}});
    if(!reservation) return;

    if(reservation.status === "SETTLED") return;
    if(reservation.status === "EXPIRED") return;

    // await Promise.all([ await prisma.reservation.update({where : { id : reservationId} , data : { status : "EXPIRED"}})])

    await prisma.reservation.update({
        where : {
            id : reservationId,
        },data : {
            status : "EXPIRED",
        }
    })

    await redis.eval( luaScripts.releaseTickets , 1 , `concert:${concertId}:stock` , qty);

    await producer.send({
        topic : "reservation.expired",
        messages : [
            {
                key : reservationId,
                value : JSON.stringify({reservationId})
            }
        ]
    })
    await producer.send({
        topic : "reservation.released",
        messages : [
            {
                key : concertId,
                value : JSON.stringify({concertId , qty}),
            }
        ]
    })
}
