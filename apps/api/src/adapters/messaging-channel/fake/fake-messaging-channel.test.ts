import { messagingChannelContract } from "../../../ports/messaging-channel.contract-test";
import { createFakeMessagingChannel } from "./fake-messaging-channel";

messagingChannelContract("fake", () => ({
  channel: createFakeMessagingChannel(),
  to: "+94771234567",
}));
