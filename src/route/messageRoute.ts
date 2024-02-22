import messageController from "../controller/messageController";
import { Router } from "express";
const messageRoute = Router();

messageRoute.get("/messages/:_roomid", messageController.getMessages);
messageRoute.post("/messages", messageController.getMessages);
messageRoute.delete(
  "/messages/bysender/:messageid",
  messageController.deleteOneMessageBySender
);
messageRoute.delete(
  "/messages/byreceiver/:messageid",
  messageController.deleteOneMessageByReceiver
);
// messageRoute.delete("/messages", messageController.deleteManyMessages);
// messageRoute.delete(
//   "/messages/all/:_roomid",
//   messageController.deleteAllMessages
// );

export default messageRoute;
