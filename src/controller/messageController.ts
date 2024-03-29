import { ErrorResponse, SuccessResponse } from "../helper/helper";
import { messagemodel } from "../model/model";
import { Request, Response } from "express";
import { sockets } from "../store";
import fs from "fs/promises";
import storagePath from "../storagePath";
import { ObjectId } from "mongodb";
import Events from "../utils/events";
import mongoose from "mongoose";

const messageController = {
  getMessages: async function (req: Request, res: Response) {
    try {
      const { roomId, currentUserId, friendId } = req.body;
      let messages: any[] = [];
      let oldMessages: any[] = [];
      oldMessages = await messagemodel.find({
        roomId: new mongoose.Types.ObjectId(roomId),
        status: {
          $in: [0, 1],
        },
        receiverId: currentUserId,
      });

      if (oldMessages.length > 0) {
        console.log("is greater ");
        const e = await messagemodel.updateMany(
          {
            roomId: new mongoose.Types.ObjectId(roomId),
            receiverId: currentUserId,
          },
          {
            $set: {
              status: 2,
            },
          }
        );
        console.log("modified ", e.modifiedCount);
      }

      messages = await messagemodel
        .aggregate([
          {
            $match: {
              $or: [
                {
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
              status: 1,
            },
          },
          {
            $sort: {
              messageId: -1,
            },
          },
        ])
        .limit(20);
      console.log("old messages ", oldMessages);
      console.log(" new messages, ", messages);

      // sockets.get(friendId)?.forEach((item) =>
      //   item.emit(
      //     Events.MESSAGE_STATUS,
      //     oldMessages.map((item) => item._id)
      //   )
      // );

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

      const result = await messagemodel.findOneAndDelete({
        _id: messageid,
      });

      if (
        result.type.split("/")[0] === "video" ||
        result.type.split("/")[0] === "image" ||
        result.type !== "text"
      ) {
        console.log("file delete");
        try {
          await fs.rm(storagePath + "/storage/chats/" + result.content);
        } catch (error) {
          console.log("error - ", error);
        }
      }
      sockets.get(userId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: result._id,
          deleteBySender: true,
        })
      );
      sockets.get(friendId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: result._id,
          deleteBySender: true,
        })
      );

      return res.status(200).json(SuccessResponse(result, "success deleted!"));
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(404).json(ErrorResponse(101, error.message));
      return res.status(404).json(ErrorResponse(101, "Something wrong !"));
    }
  },
  deleteOneMessageByReceiver: async function (req: Request, res: Response) {
    try {
      const { messageid } = req.params;
      const { roomId, userId, friendId } = req.body;

      const result = await messagemodel.findOneAndUpdate(
        {
          _id: messageid,
        },
        {
          deletedByReceiver: true,
        }
      );

      sockets.get(userId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageid,
          deleteBySender: false,
        })
      );
      sockets.get(friendId)?.forEach((socket) =>
        socket.emit("deleteMessage", {
          messageId: messageid,
          deleteBySender: false,
        })
      );

      return res
        .status(200)
        .json(SuccessResponse(result, "successfully deleted!"));
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(404).json(ErrorResponse(101, error.message));
      return res.status(404).json(ErrorResponse(101, "Something wrong !"));
    }
  },
  getMessagesByPagination: async function (req: Request, res: Response) {},
};

export default messageController;
