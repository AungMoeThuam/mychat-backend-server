import { ObjectId } from "mongodb";
import { mongoose } from "../config/dbConnection";

import {
  ErrorServiceResult,
  SuccessServiceResult,
} from "../utils/serviceResult";
import fs from "fs/promises";
import storagePath from "../storagePath";
import friendshipmodel from "../model/friendshipModel";
import messagemodel from "../model/messageModel";

type getMessagesParameter = {
  roomId: string;
  currentUserId: string;
  friendId: string;
};

type DeleteMessageParameter = {
  roomId: string;
  userId: string;
  friendId: string;
  messageId: string;
};

const messageService = {
  getMessages: async function (parameter: getMessagesParameter) {
    try {
      const { roomId, currentUserId, friendId } = parameter;
      let messages: any[] = [];
      let oldMessages: any[] = [];

      const checkFriendshipIsExisted = await friendshipmodel.findOne({
        _id: new mongoose.Types.ObjectId(roomId),
      });

      if (checkFriendshipIsExisted) {
        const pass =
          checkFriendshipIsExisted.receipent == currentUserId ||
          checkFriendshipIsExisted.requester == currentUserId;

        if (pass === false)
          return ErrorServiceResult("you are not friend with this person!");
      } else return ErrorServiceResult("unauthorized message!");

      oldMessages = await messagemodel.find({
        roomId: new mongoose.Types.ObjectId(roomId),
        status: {
          $in: [0, 1],
        },
        receiverId: currentUserId,
      });

      if (oldMessages.length > 0) {
        await messagemodel.updateMany(
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
      }

      messages = await messagemodel
        .aggregate([
          {
            $match: {
              roomId: new ObjectId(roomId),
              // $or: [
              //   {
              //     roomId: new ObjectId(roomId),
              //     // receiverId: currentUserId,
              //     // senderId: friendId,
              //   },
              // ],
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

      return SuccessServiceResult(messages.reverse());
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  deleteMessageBySender: async function (
    deleteMessageParameter: DeleteMessageParameter
  ) {
    try {
      const { roomId, userId, friendId, messageId } = deleteMessageParameter;

      const result = await messagemodel.findOneAndDelete({
        _id: messageId,
      });

      if (result.type !== "text") {
        await fs.rm(storagePath + "/storage/chats/" + result.content);
      }

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error.message);
    }
  },
  deleteMessageByReceiver: async function (
    deleteMessageParameter: DeleteMessageParameter
  ) {
    try {
      const { roomId, userId, friendId, messageId } = deleteMessageParameter;

      const result = await messagemodel.findOneAndUpdate(
        {
          _id: messageId,
        },
        {
          deletedByReceiver: true,
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};

export default messageService;
