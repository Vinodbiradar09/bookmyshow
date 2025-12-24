import { prisma } from "../..//primary/dist/src/lib/prisma.js";
import { consumerKafka , consumer} from "./consumer.js";
// first consumer 

const reservationCreatedConsumer = async ()=>{
    try {
       await consumer.run({
        // @ts-ignore
        eachMessage : async({ topic , partition, message, heartbeat, pause})=>{
            console.log("the message is consumed " , message.value?.toString());
        }
       })
    } catch (error) {
        console.log("error in the consumer consuming the message reservationCreatedConsumer" , error);
    }
}
await consumerKafka();
reservationCreatedConsumer();