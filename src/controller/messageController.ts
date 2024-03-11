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
                  roomId: new ObjectId(roomId),
                },
                // {
                //   receiverId: currentUserId,
                //   deletedByReceiver: false,
                //   roomId: new ObjectId(roomId),
                // },
                // {
                //   senderId: currentUserId,
                //   roomId: new ObjectId(roomId),
                // },
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
