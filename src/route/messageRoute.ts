import messageController from "../controller/messageController";
import { Router } from "express";
const messageRoute = Router();

messageRoute.get("/messages/:roomId", messageController.getMessages);
messageRoute.post("/messages", messageController.getMessages);
messageRoute.delete(
  "/messages/bysender",
  messageController.deleteOneMessageBySender
);
messageRoute.delete(
  "/messages/byreceiver",
  messageController.deleteOneMessageByReceiver
);
messageRoute.post("/messages/v1", messageController.getMessagesByPagination);

export default messageRoute;
