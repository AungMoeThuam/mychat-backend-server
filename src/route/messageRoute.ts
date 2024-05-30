import messageController from "../http-controller/messageController";
import { Router } from "express";
const messageRoute = Router();

messageRoute.get("/messages/:_roomid", messageController.getMessages);
messageRoute.post("/messages", messageController.getMessages);
messageRoute.delete(
  "/messages/bysender",
  messageController.deleteOneMessageBySender
);
messageRoute.delete(
  "/messages/byreceiver",
  messageController.deleteOneMessageByReceiver
);

export default messageRoute;
