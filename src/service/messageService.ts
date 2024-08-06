import { ObjectId } from "mongodb";
import { mongoose } from "../config/dbConnection";

import {
  ErrorServiceResult,
  SuccessServiceResult,
} from "../utils/serviceResult";
import fs from "fs/promises";
import friendshipmodel from "../model/friendshipModel";
import messagemodel from "../model/messageModel";
import { fileStoragePath } from "../utils/fileStoragePath";

type getMessagesParameter = {
  roomId: string;
  currentUserId: string;
  friendId: string;
  lastMessageId?: string;
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
          checkFriendshipIsExisted.receiverId == currentUserId ||
          checkFriendshipIsExisted.initiatorId == currentUserId;

        if (pass === false)
          return ErrorServiceResult("you are not friend with this person!");
      } else return ErrorServiceResult("unauthorized message!");

      oldMessages = await messagemodel.find({
        friendshipId: new mongoose.Types.ObjectId(roomId),
        deliveryStatus: {
          $in: [0, 1],
        },
        receiverId: currentUserId,
      });

      if (oldMessages.length > 0) {
        await messagemodel.updateMany(
          {
            friendshipId: new mongoose.Types.ObjectId(roomId),
            receiverId: currentUserId,
          },
          {
            $set: {
              deliveryStatus: 2,
            },
          }
        );
      }

      messages = await messagemodel
        .aggregate([
          {
            $match: {
              friendshipId: new mongoose.Types.ObjectId(roomId),
            },
          },
          {
            $project: {
              _id: 0,
              messageId: "$_id",
              senderId: 1,
              receiverId: 1,
              friendshipId: 1,
              content: 1,
              type: 1,
              isDeletedByReceiver: 1,
              createdAt: 1,
              deliveryStatus: 1,
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
  getMessagesByPagination: async function (parameter: getMessagesParameter) {
    try {
      const { roomId, currentUserId, friendId, lastMessageId } = parameter;
      let messages: any[] = [];
      let unReadMessages: any[] = [];

      const checkFriendshipIsExisted = await friendshipmodel.findOne({
        _id: new mongoose.Types.ObjectId(roomId),
      });

      if (checkFriendshipIsExisted) {
        const pass =
          checkFriendshipIsExisted.receiverId == currentUserId ||
          checkFriendshipIsExisted.initiatorId == currentUserId;

        if (pass === false)
          return ErrorServiceResult("you are not friend with this person!");
      } else return ErrorServiceResult("unauthorized message!");

      unReadMessages = await messagemodel.find({
        friendshipId: new mongoose.Types.ObjectId(roomId),
        deliveryStatus: {
          $in: [0, 1],
        },
        receiverId: currentUserId,
      });

      if (unReadMessages.length > 0) {
        await messagemodel.updateMany(
          {
            friendshipId: new mongoose.Types.ObjectId(roomId),
            receiverId: currentUserId,
          },
          {
            $set: {
              deliveryStatus: 2,
            },
          }
        );
      }

      const startPage =
        lastMessageId === ""
          ? [
              {
                $match: {
                  friendshipId: new mongoose.Types.ObjectId(roomId),
                },
              },
            ]
          : [
              {
                $match: {
                  _id: {
                    $lt: new mongoose.Types.ObjectId(lastMessageId),
                  },
                },
              },
              {
                $match: {
                  friendshipId: new mongoose.Types.ObjectId(roomId),
                },
              },
            ];

      messages = await messagemodel.aggregate([
        ...startPage,

        {
          $project: {
            _id: 0,
            messageId: "$_id",
            senderId: 1,
            receiverId: 1,
            friendshipId: 1,
            content: 1,
            type: 1,
            isDeletedByReceiver: 1,
            createdAt: 1,
            deliveryStatus: 1,
          },
        },
        {
          $sort: {
            messageId: -1,
          },
        },
        {
          $limit: 20,
        },
      ]);

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
        await fs.rm(fileStoragePath + "/chats/" + result.content);
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
          isDeletedByReceiver: true,
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};

export default messageService;
