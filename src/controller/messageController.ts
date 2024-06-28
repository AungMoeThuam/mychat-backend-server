import { mongoose } from "../config/dbConnection";
import friendshipmodel from "../model/friendshipModel";

export async function getConversationList(id: string) {
  const result = await friendshipmodel.aggregate([
    {
      $match: {
        $or: [
          {
            receiverId: new mongoose.Types.ObjectId(id),
            status: 3,
          },
          {
            initiatorId: new mongoose.Types.ObjectId(id),
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
              $eq: ["$receiverId", new mongoose.Types.ObjectId(id)],
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
      $unwind: {
        path: "$joined",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        friendId: 1,
      },
    },
    {
      $unset: "joined",
    },
  ]);

  return result;
}
