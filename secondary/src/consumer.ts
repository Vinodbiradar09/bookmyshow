import { kafka } from "../../primary/dist/src/kafka/client.js";
let consumer : any;
const consumerKafka = async()=>{
    try {
        consumer = kafka.consumer({groupId : "1"});
        await consumer.connect();
    } catch (error) {
        console.log("error in kafka consumer");
    }
}

export { consumerKafka , consumer};

