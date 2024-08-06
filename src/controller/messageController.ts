import { ErrorResponse, SuccessResponse } from "../utils/helper";
import { Request, Response } from "express";
import { sockets } from "../utils/store";
import messageService from "../service/messageService";

const messageController = {
  getMessages: async function (req: Request, res: Response) {
    try {
      const { roomId, currentUserId, friendId } = req.body;
      const { data, error } = await messageService.getMessages({
        roomId,
        currentUserId,
        friendId,
      });

      if (error)
        return res
          .status(401)
          .json(ErrorResponse(error.message, error.errorCode));

      res.status(200).json(data);
    } catch (error) {
      return res.status(500).json(ErrorResponse("Internal server error!"));
    }
  },
  deleteOneMessageBySender: async function (req: Request, res: Response) {
    try {
      const { roomId, userId, friendId, messageId } = req.body;

      const { data, error } = await messageService.deleteMessageBySender({
        roomId,
        userId,
        friendId,
        messageId,
      });

      if (error) return res.status(401).json(ErrorResponse(error.message));

      sockets.get(userId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: data._id,
          deleteBySender: true,
        })
      );
      sockets.get(friendId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: data._id,
          deleteBySender: true,
        })
      );

      return res.status(200).json(SuccessResponse(data, "success deleted!"));
    } catch (error) {
      return res.status(404).json(ErrorResponse(error));
    }
  },
  deleteOneMessageByReceiver: async function (req: Request, res: Response) {
    try {
      const { roomId, userId, friendId, messageId } = req.body;

      const { data, error } = await messageService.deleteMessageByReceiver({
        roomId,
        userId,
        friendId,
        messageId,
      });

      if (error) return res.status(404).json(ErrorResponse(error.message));

      sockets.get(userId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageId,
          deleteBySender: false,
        })
      );
      sockets.get(friendId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageId,
          deleteBySender: false,
        })
      );

      return res
        .status(200)
        .json(SuccessResponse(data, "successfully deleted!"));
    } catch (error) {
      return res.status(404).json(ErrorResponse(error));
    }
  },
  getMessagesByPagination: async function (req: Request, res: Response) {
    try {
      const { roomId, currentUserId, friendId, lastMessageId } = req.body;
      const { data, error } = await messageService.getMessagesByPagination({
        roomId,
        currentUserId,
        friendId,
        lastMessageId,
      });
      if (error) return res.status(404).send(error);
      // return res.status(200).send({ data, lastMessageId: data[0].messageId });
      return res.status(200).send(data);
    } catch (error) {
      return res.status(500).json(ErrorResponse("Internal server error!"));
    }
  },
};

export default messageController;
