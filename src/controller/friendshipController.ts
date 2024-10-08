import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "../utils/helper";
import { activeUserList, sockets } from "../utils/store";
import { CustomRequest } from "../utils/types";
import { mongoose } from "../config/dbConnection";
import { friendshipService } from "../service/friendshipService";
import friendshipmodel from "../model/friendshipModel";

const friendshipController = {
  checkFriendOrNot: async function (req: Request, res: Response) {
    const { roomId, friendId, currentUserId } = req.body;

    try {
      const result = await friendshipService.checkFriendOrNot(
        roomId,
        friendId,
        currentUserId
      );
      if (result.error)
        return res
          .status(401)
          .json(ErrorResponse(result.error?.message, result.error.errorCode));

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json(ErrorResponse(error.message));
    }
  },

  request: async function (req: Request, res: Response) {
    const { requesterId, receipentId, friendshipId } = req.body;

    try {
      const result = await friendshipService.request({
        receipentId,
        requesterId,
        friendshipId,
      });

      if (result.error)
        return res.status(401).json(ErrorResponse(result.error.message));

      sockets.get(receipentId)?.forEach((socket) => {
        socket.emit("request", {
          receipent: receipentId,
          requester: requesterId,
          status: 1,
        });
        socket.emit("friendRelationUpdate", "request");
      });

      return res.status(200).json({ message: "successfully requested!" });
    } catch (error) {
      return res.status(500).json(ErrorResponse(error.message));
    }
  },
  accept: async function (req: Request, res: Response) {
    const { requesterId, receipentId, friendshipId } = req.body;

    try {
      const result = await friendshipService.accept({
        receipentId,
        requesterId,
        friendshipId,
      });

      if (result.error)
        return res.status(400).json(ErrorResponse(result.error.message));

      sockets
        .get(requesterId)
        ?.forEach((socket) => socket.emit("accept", "acceptedByFriend"));
      sockets
        .get(receipentId)
        ?.forEach((socket) => socket.emit("accept", "acceptedByYou"));

      return res
        .status(200)
        .json({ message: "You have accepted friend request!" });
    } catch (error) {
      return res.status(404).json(ErrorResponse(error.message));
    }
  },
  reject: async function (req: Request, res: Response) {
    const { requesterId, receipentId, friendshipId } = req.body;
    try {
      const result = await friendshipService.reject({
        receipentId,
        requesterId,
        friendshipId,
      });

      if (result.error)
        return res.status(404).json(ErrorResponse(result.error.message));

      return res.status(200).json({ message: "Rejected successfully!" });
    } catch (error) {
      res.status(404).json(ErrorResponse("error in reject!"));
    }
  },

  unfriend: async function (req: Request, res: Response) {
    const { friendId, userId, friendshipId } = req.body;
    try {
      const result = await friendshipService.unfriend({
        friendId,
        userId,
        friendshipId,
      });

      if (result.error) {
        return res.status(401).json(ErrorResponse(result.error.message));
      }

      sockets.get(friendId)?.forEach((socket) => {
        socket.emit("unfriend");
        socket.emit("friendRelationUpdate", {
          event: "unfriend",
          friendId: friendId,
        });
        sockets
          .get(userId)
          ?.forEach((socket) => socket.emit("friendRelationUpdate", "accept"));
      });
      return res.status(200).json({ message: "successfully unfriended!" });
    } catch (error: any) {
      return res.status(404).json(ErrorResponse(error.message));
    }
  },
  block: async function (req: Request, res: Response) {
    const { friendshipId, currentUserId, friendId } = req.body;
    try {
      const result = await friendshipService.block({
        friendshipId,
        currentUserId,
        friendId,
      });

      if (result.error)
        return res.status(404).json(ErrorResponse(result.error.message));

      return res.status(200).json({ message: "Blocked successfully!" });
    } catch (error) {
      res.status(404).json(ErrorResponse("error in block!"));
    }
  },
  unblock: async function (req: Request, res: Response) {
    const { friendshipId, currentUserId } = req.body;
    try {
      const result = await friendshipService.unblock({
        friendshipId,
        currentUserId,
      });

      if (result.error)
        return res.status(404).json(ErrorResponse(result.error.message));

      return res.status(200).json({ message: "Blocked successfully!" });
    } catch (error) {
      res.status(404).json(ErrorResponse("error in block!"));
    }
  },
  getFriendsList: async function (req: CustomRequest, res: Response) {
    let result: any;
    let userId = req.encodedToken._id;

    try {
      result = await friendshipmodel
        .aggregate([
          {
            $match: {
              $or: [
                {
                  receiverId: new mongoose.Types.ObjectId(userId),
                  status: 3,
                },
                {
                  initiatorId: new mongoose.Types.ObjectId(userId),
                  status: 3,
                },
              ],
            },
          },
          {
            $addFields: {
              friendId: {
                $cond: {
                  if: {
                    $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)],
                  },
                  then: "$initiatorId",
                  else: "$receiverId",
                },
              },
            },
          },

          {
            $lookup: {
              from: "users",
              localField: "friendId",
              foreignField: "_id",
              as: "joined",
              pipeline: [
                {
                  $unset: ["_id", "email", "password", "phone", "createdAt"],
                },
              ],
            },
          },
          {
            $unwind: "$joined",
          },
          {
            $addFields: {
              friendshipId: "$_id",
              friendName: "$joined.name",
              profilePhoto: "$joined.profilePhoto",
              friendshipStatus: "$status",
            },
          },
          {
            $project: {
              joined: 0,
              __v: 0,
              latestInteractedAt: 0,
              createdAt: 0,
              initiatorId: 0,
              receiverId: 0,
              status: 0,
              history: 0,
            },
          },
          {
            $lookup: {
              from: "messages",
              localField: "_id",
              foreignField: "friendshipId",
              as: "joined",
              pipeline: [
                {
                  $sort: {
                    _id: -1,
                  },
                },
                {
                  $limit: 1,
                },
                {
                  $project: {
                    _id: 0,
                    isTheLastMessageDeletedByReceiver: "$isDeletedByReceiver",
                    lastMessageCreatedAt: "$createdAt",
                    lastMessageSenderId: "$senderId",
                    lastMessageReceiverId: "$receiverId",
                    lastMessageContent: "$content",
                    lastMessageType: "$type",
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$joined",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "messages",
              localField: "_id",
              foreignField: "friendshipId",
              as: "joined1",
              pipeline: [
                {
                  $match: {
                    deliveryStatus: {
                      $in: [0, 1],
                    },
                    senderId: {
                      $ne: new mongoose.Types.ObjectId(userId),
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }, // Counting documents
                  },
                },
                {
                  $project: {
                    _id: 0,
                    unreadMessageCount: "$count",
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
          {
            $unwind: {
              path: "$joined1",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$$ROOT", "$joined", "$joined1"],
              },
            },
          },
          {
            $unset: ["joined", "joined1"],
          },
        ])
        .sort({ lastMessageCreatedAt: -1 });

      const newList = result.map((f) => {
        if (activeUserList.filter((s) => s == f.friendId).length === 1) {
          return { ...f, isActiveNow: true };
        } else return f;
      });
      res.status(200).json(newList);
    } catch (error) {
      res.status(500).json(ErrorResponse("internal server error!"));
    }
  },
  getRequestFriendList: async function (req: Request, res: Response) {
    let result: any;
    const { id: userId } = req.params;
    try {
      result = await friendshipmodel.aggregate([
        {
          $match: {
            $or: [
              {
                receiverId: new mongoose.Types.ObjectId(userId),
                initiatorId: {
                  $ne: new mongoose.Types.ObjectId(userId),
                },
                status: 1,
              },
            ],
          },
        },
        {
          $addFields: {
            personId: {
              $cond: {
                if: {
                  $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)],
                },
                then: "$initiatorId",
                else: "$receiverId",
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "personId",
            foreignField: "_id",
            as: "joined",
            pipeline: [
              {
                $unset: ["_id", "email", "password", "phone", "createdAt"],
              },
            ],
          },
        },
        {
          $unwind: "$joined",
        },
        {
          $project: {
            personId: 1,
            personName: "$joined.name",
            profilePhoto: "$joined.profilePhoto",
            friendshipStatus: "$status",
            friendshipId: "$_id",
            friendshipReceiverId: "$receiverId",
            friendshipInitiatorId: "$initiatorId",
          },
        },
        {
          $project: {
            _id: 0,
            joined: 0,
          },
        },
      ]);

      res.status(200).json(result);
    } catch (error) {
      res.status(404).json(ErrorResponse("error in getting pending list!"));
    }
  },
  getPendingList: async function (req: Request, res: Response) {
    let result: any;
    const { id: userId } = req.params;
    try {
      result = await friendshipmodel.aggregate([
        {
          $match: {
            $or: [
              {
                initiatorId: new mongoose.Types.ObjectId(userId),
                receiverId: {
                  $ne: new mongoose.Types.ObjectId(userId),
                },
                status: 1,
              },
            ],
          },
        },
        {
          $addFields: {
            personId: {
              $cond: {
                if: {
                  $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)],
                },
                then: "$initiatorId",
                else: "$receiverId",
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "personId",
            foreignField: "_id",
            as: "joined",
            pipeline: [
              {
                $unset: ["_id", "email", "password", "phone", "createdAt"],
              },
            ],
          },
        },
        {
          $unwind: "$joined",
        },
        {
          $project: {
            personId: 1,
            personName: "$joined.name",
            profilePhoto: "$joined.profilePhoto",
            friendshipStatus: "$status",
            friendshipId: "$_id",
            friendshipReceiverId: "$receiverId",
            friendshipInitiatorId: "$initiatorId",
          },
        },
        {
          $project: {
            joined: 0,
            _id: 0,
          },
        },
      ]);

      res.status(200).json(result);
    } catch (error) {
      res.status(404).json(ErrorResponse(error.message));
    }
  },
  getBlockFriendList: async function (req: Request, res: Response) {
    let result: any;
    const { id: userId } = req.params;
    console.log(userId);
    try {
      result = await friendshipmodel.aggregate([
        {
          $match: {
            $or: [
              {
                receiverId: new mongoose.Types.ObjectId(userId),
                initiatorId: {
                  $ne: new mongoose.Types.ObjectId(userId),
                },
                status: 2,
              },
            ],
          },
        },
        {
          $addFields: {
            friendId: {
              $cond: {
                if: {
                  $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)],
                },
                then: "$initiatorId",
                else: "$receiverId",
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "friendId",
            foreignField: "_id",
            as: "joined",
            pipeline: [
              {
                $unset: ["_id", "email", "password", "phone", "createdAt"],
              },
            ],
          },
        },
        {
          $unwind: "$joined",
        },
        {
          $addFields: {
            name: "$joined.name",
            profilePhoto: "$joined.profilePhoto",
            friendshipId: "$_id",
          },
        },
        {
          $project: {
            joined: 0,
          },
        },
      ]);

      res.status(200).json(result);
    } catch (error) {
      res.status(404).json(ErrorResponse("error in getting pending list!"));
    }
  },
};

export default friendshipController;
