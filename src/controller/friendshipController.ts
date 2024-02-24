import { GridFSBucketReadStream, ObjectId, WriteConcern } from "mongodb";
import { friendshipmodel } from "../model/model";
import { Request, Response } from "express";
import {
  ErrorResponse,
  Status,
  SuccessMResponse,
  SuccessResponse,
} from "../helper/helper";

import { activeUserList, extra, sockets } from "../store";
import { Socket } from "socket.io";
import { CustomRequest } from "../utils/types";
import { db, mongoose } from "../config/dbConnection";
let concurrent: { id1: string; id2: string }[] = [];
const friendshipController = {
  request: async function (req: Request, res: Response) {
    const { requesterId, receipentId } = req.body;

    let result: any;

    try {
      result = await friendshipmodel.findOne({
        $or: [
          {
            requester: requesterId,
            receipent: receipentId,
          },
          {
            requester: receipentId,
            receipent: requesterId,
          },
        ],
        status: { $in: [1, 4] },
      });

      if (result == null) {
        result = await friendshipmodel.create({
          receipent: receipentId,
          requester: requesterId,
          status: 1,
          version: Date.now(),
        });
      } else if (result.status === 1) {
        res
          .status(500)
          .json(
            ErrorResponse(101, "cannot process the request at the moment!")
          );
        return;
      } else {
        result = await friendshipmodel.updateOne(result, {
          $set: {
            receipent: receipentId,
            requester: requesterId,
            status: 1,
          },
        });
      }

      sockets.get(receipentId)?.forEach((socket) => {
        socket.emit("request", {
          receipent: receipentId,
          requester: requesterId,
          status: 1,
        });
        socket.emit("friendRelationUpdate", "request");
      });

      return res
        .status(200)
        .json(SuccessResponse(result, "successfully requested!"));
    } catch (error: any) {
      console.error(error);
      res.status(500).json(ErrorResponse(101, error.message));
      return;
    }
  },
  accept: async function (req: Request, res: Response) {
    const { requesterId, receipentId } = req.body;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        receipent: receipentId,
        requester: requesterId,
        status: 1,
      });
      if (result === null) {
        return res
          .status(200)
          .json(
            ErrorResponse(
              101,
              "There is a conflict friend action! try refresh!"
            )
          );
      }
      result = await friendshipmodel.updateOne(
        {
          receipent: receipentId,
          requester: requesterId,
        },
        {
          $set: {
            status: 3,
          },
        }
      );

      sockets
        .get(requesterId)
        ?.forEach((socket) => socket.emit("accept", "acceptedByFriend"));
      sockets
        .get(receipentId)
        ?.forEach((socket) => socket.emit("accept", "acceptedByYou"));
      res
        .status(200)
        .json(SuccessResponse(result, "You have accepted friend request!"));
    } catch (error) {
      res.status(404).json(ErrorResponse(101, error.message));
    }
  },
  reject: async function (req: Request, res: Response) {
    const { requesterId, receipentId } = req.body;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        $or: [
          {
            receipent: receipentId,
            requester: requesterId,
            history: true,
          },
          {
            receipent: receipentId,
            requester: requesterId,
            history: false,
          },
        ],
      });
      if (result == null || result.status === 3)
        return res
          .status(200)
          .json(
            ErrorResponse(
              101,
              "There is b a conflict concurrent request! try refresh!"
            )
          );

      if (result.status === 1)
        result = await friendshipmodel.deleteOne({
          receipent: receipentId,
          requester: requesterId,
        });
      else
        result = await friendshipmodel.updateOne(
          {
            receipent: receipentId,
            requester: requesterId,
          },
          {
            status: 4,
          }
        );

      res.status(200).json(SuccessResponse(result, "Rejected successfully!"));
    } catch (error) {
      res.status(404).json(ErrorResponse(101, "error in reject!"));
    }
  },
  getFriendsList: async function (req: CustomRequest, res: Response) {
    let result: any;
    // const { id: userId } = req.params;
    console.log("id- ", req.encodedToken);
    let userId = req.encodedToken._id;

    try {
      result = await friendshipmodel
        .aggregate([
          {
            $match: {
              $or: [
                {
                  receipent: new mongoose.Types.ObjectId(userId),
                  status: 3,
                },
                {
                  requester: new mongoose.Types.ObjectId(userId),
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
                    $eq: ["$receipent", new mongoose.Types.ObjectId(userId)],
                  },
                  then: "$requester",
                  else: "$receipent",
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
              roomId: "$_id",
              name: "$joined.name",
              profilePhoto: "$joined.profilePhoto",
            },
          },
          {
            $project: {
              joined: 0,
              __v: 0,
              latestInteractedAt: 0,
              createdAt: 0,
            },
          },
          {
            $lookup: {
              from: "messages",
              localField: "_id",
              foreignField: "roomId",
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
                    senderId: 1,
                    receiverId: 1,
                    content: 1,
                    type: 1,
                    deletedByReceiver: 1,
                    messageCreatedAt: "$createdAt",
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
            $project: {
              _id: 0,
            },
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$$ROOT", "$joined"],
              },
            },
          },
          {
            $unset: "joined",
          },
        ])
        .sort({ latestInteractedAt: -1 });

      const newList = result.map((f) => {
        if (activeUserList.filter((s) => s == f.friendId).length === 1) {
          return { ...f, active: true };
        } else return f;
      });
      res.status(200).json(SuccessResponse(newList, "data fetching success!"));
    } catch (error) {
      res.status(404).json(ErrorResponse(101, "internal server error!"));
    }
  },
  getRequestFriendList: async function (req: Request, res: Response) {
    let result: any;
    const { id: userId } = req.params;
    console.log(userId);
    try {
      result = await friendshipmodel.aggregate([
        {
          $match: {
            $or: [
              {
                receipent: new mongoose.Types.ObjectId(userId),
                requester: {
                  $ne: new mongoose.Types.ObjectId(userId),
                },
                status: 1,
              },
              // {
              //   requester: new mongoose.Types.ObjectId(userId),
              //   receipent: {
              //     $ne: new mongoose.Types.ObjectId(userId),
              //   },
              //   status: 1,
              // },
            ],
          },
        },
        {
          $addFields: {
            friendId: {
              $cond: {
                if: {
                  $eq: ["$receipent", new mongoose.Types.ObjectId(userId)],
                },
                then: "$requester",
                else: "$receipent",
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
          },
        },
        {
          $project: {
            joined: 0,
          },
        },
      ]);

      const a: SuccessMResponse = {
        status: Status.Success,
        data: result,
      };
      res.status(200).json(a);
    } catch (error) {
      res.status(404).json(error);
    }
  },
  getPendingList: async function (req: Request, res: Response) {
    let result: any;
    const { id: userId } = req.params;
    console.log(userId);
    try {
      result = await friendshipmodel.aggregate([
        {
          $match: {
            $or: [
              // {
              //   receipent: new mongoose.Types.ObjectId(userId),
              //   requester: {
              //     $ne: new mongoose.Types.ObjectId(userId),
              //   },
              //   status: 1,
              // },
              {
                requester: new mongoose.Types.ObjectId(userId),
                receipent: {
                  $ne: new mongoose.Types.ObjectId(userId),
                },
                status: 1,
              },
            ],
          },
        },
        {
          $addFields: {
            friendId: {
              $cond: {
                if: {
                  $eq: ["$receipent", new mongoose.Types.ObjectId(userId)],
                },
                then: "$requester",
                else: "$receipent",
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
          },
        },
        {
          $project: {
            joined: 0,
          },
        },
      ]);

      const a: SuccessMResponse = {
        status: Status.Success,
        data: result,
      };
      res.status(200).json(a);
    } catch (error) {
      res.status(404).json(error);
    }
  },
  getAll: async function (req: Request, res: Response) {
    try {
      const userId = new ObjectId(req.params.id);
      console.log(userId);
      const result = await friendshipmodel.aggregate([
        {
          $match: {
            userId: userId,
          },
        },
        {
          $unwind: "$relationships",
        },
        {
          $match: {
            "relationships.status": "accepted",
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$$ROOT", "$relationships"],
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
                $unset: ["_id", "email", "password", "phone"],
              },
            ],
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$$ROOT", { $arrayElemAt: ["$joined", 0] }],
            },
          },
        },
        {
          $unset: ["joined", "relationships"],
        },
      ]);
      console.log(result);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json(error);
    }
  },
  cancelRequest: async function (req: Request, res: Response) {
    const { requesterId, receipentId } = req.body;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        receipent: receipentId,
        requester: requesterId,
        history: true,
      });
      if (result == null)
        result = await friendshipmodel.deleteOne({
          receipent: receipentId,
          requester: requesterId,
        });
      else
        result = await friendshipmodel.updateOne(
          {
            receipent: receipentId,
            requester: requesterId,
          },
          {
            status: 4,
          }
        );

      res
        .status(200)
        .json(SuccessResponse(result, "friend request has been canceled!"));
    } catch (error) {
      res.status(404).json(ErrorResponse(101, "Something went wrong!"));
    }
  },
  unfriend: async function (req: Request, res: Response) {
    const { friendId, userId } = req.body;
    let result: any;
    console.log(friendId, " - ", userId);
    try {
      result = await friendshipmodel.findOne({
        status: 3,
        $or: [
          { receipent: userId, requester: friendId },
          { receipent: friendId, requester: userId },
        ],
      });
      if (result === null) {
        res
          .status(404)
          .json(
            ErrorResponse(
              101,
              "there is a conflict concurrent request at the moment! try refresh!"
            )
          );
        return;
      }
      result = await friendshipmodel.updateOne(
        {
          $or: [
            { receipent: userId, requester: friendId },
            { receipent: friendId, requester: userId },
          ],
        },
        {
          history: true,
          status: 4,
        }
      );

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
      res.status(200).json(SuccessResponse(result, "successfully unfriended!"));
    } catch (error: any) {
      res.status(404).json(ErrorResponse(101, error.message));
    }
  },
};

export default friendshipController;
