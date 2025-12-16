import { kafka } from "./client.js";
import { KAFKA_TOPICS } from "./topics.js";
const kafkaTopics = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    const existingTopics = await admin.listTopics();
    const topicsTocreate = KAFKA_TOPICS.filter(
      (t) => !existingTopics.includes(t.topic)
    );
    if (topicsTocreate.length > 0) {
      const created = await admin.createTopics({
        topics: topicsTocreate.map(({ topic, numPartitions }) => ({
          topic,
          numPartitions,
        })),
      });
      console.log("Topic creation result:", created);
    } else {
      console.log("All Kafka topics already exist");
    }
    await admin.disconnect();
  } catch (error) {
    console.log("failed to create admin and topics", error);
    throw error;
  }
};
export { kafkaTopics };
