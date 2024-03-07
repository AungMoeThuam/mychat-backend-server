import {
  ErrorResponse,
  Status,
  SuccessMResponse,
  SuccessResponse,
} from "../helper/helper";
import { messagemodel } from "../model/model";
import { Request, Response } from "express";
import { sockets } from "../store";
import fs from "fs/promises";
import storagePath from "../storagePath";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const messageController = {
  getMessages: async function (req: Request, res: Response) {
    try {
      const { roomId, currentUserId } = req.body;

      // const messages = await messagemodel
      //   .find({
      //     roomId: roomId,
      //     $or: [
      //       { receiverId: currentUserId, deletedByReceiver: false },
      //       {
      //         senderId: currentUserId,
      //       },
      //     ],
      //   })
      //   .select("-__v");
      const messages = await messagemodel
        .aggregate([
          {
            $match: {
              $or: [
                {
                  receiverId: currentUserId,
                  deletedByReceiver: false,
                  roomId: new ObjectId(roomId),
                },
                {
                  senderId: currentUserId,
                  roomId: new ObjectId(roomId),
                },
              ],
            },
          },
          {
            $project: {
              _id: 0,
              messageId: "$_id",
              senderId: 1,
              receiverId: 1,
              roomId: 1,
              content: 1,
              type: 1,
              deletedBySender: 1,
              deletedByReceiver: 1,
              createdAt: 1,
            },
          },
          {
            $sort: {
              messageId: -1,
            },
          },
        ])
        .limit(20);

      res
        .status(200)
        .json(
          SuccessResponse(
            messages.reverse(),
            "Messages are succefully fetched!"
          )
        );
    } catch (error) {
      return res.status(500).json(ErrorResponse(101, "Internal server error!"));
    }
  },
  deleteOneMessageBySender: async function (req: Request, res: Response) {
    try {
      const { messageid } = req.params;
      const { roomId, userId, friendId } = req.body;
      // const messages = await messagemodel.deleteOne({
      const message = await messagemodel.findOneAndDelete({
        _id: messageid,
      });

      const response: SuccessMResponse = {
        status: Status.Success,
        data: message,
      };
      if (
        message.type === "video" ||
        message.type === "image" ||
        message.type === "file"
      ) {
        console.log("file delete");
        try {
          await fs.rm(storagePath + "/storage/chats/" + message.content);
        } catch (error) {
          console.log("error - ", error);
        }
      }
      sockets.get(userId).forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: message._id,
          deleteBySender: true,
        })
      );
      sockets.get(friendId).forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: message._id,
          deleteBySender: true,
        })
      );

      res.status(200).json(response);
    } catch (error) {}
  },
  deleteOneMessageByReceiver: async function (req: Request, res: Response) {
    try {
      const { messageid } = req.params;
      const { roomId, userId, friendId } = req.body;

      const message = await messagemodel.updateOne(
        {
          _id: messageid,
        },
        {
          deletedByReceiver: true,
        }
      );
      const response: SuccessMResponse = {
        status: Status.Success,
        data: message,
      };

      sockets.get(userId).forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageid,
          deleteBySender: false,
        })
      );
      sockets.get(friendId).forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageid,
          deleteBySender: false,
        })
      );

      res.status(200).json(response);
    } catch (error) {}
  },
  getMessagesByPagination: async function (req: Request, res: Response) {},
};

export default messageController;
