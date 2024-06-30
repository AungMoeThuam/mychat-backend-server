import { resourceUsage } from "process";
import { mongoose } from "../config/dbConnection";
import {
  ErrorServiceResult,
  SuccessServiceResult,
} from "../utils/serviceResult";
import { MongoServerError } from "mongodb";
import usermodel from "../model/userModel";

interface SearchPeopleParameter {
  searchName: string;
  theUserWhoSearchID: string;
}

interface User {
  firstName: String;
  lastName: String;
  email: String;
  phone: String;
  password: String;
}

export const userService = {
  searchPeople: async function (searchPeopleParameter: SearchPeopleParameter) {
    try {
      const { searchName, theUserWhoSearchID } = searchPeopleParameter;
      const uID = new mongoose.Types.ObjectId(theUserWhoSearchID.toString());

      const result = await usermodel.aggregate([
        {
          $match: {
            name: {
              $regex: `.*${searchName}.*`,
              $options: "i",
            },
          },
        },
        {
          $project: {
            email: 0,
            password: 0,
            phone: 0,
            __v: 0,
          },
        },
        {
          $lookup: {
            from: "friendships",
            let: {
              userId: "$_id",
              uID: uID,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      {
                        $and: [
                          {
                            $eq: ["$receiverId", "$$userId"],
                          },
                          {
                            $eq: ["$initiatorId", "$$uID"],
                          },
                        ],
                      },
                      {
                        $and: [
                          {
                            $eq: ["$initiatorId", "$$userId"],
                          },
                          {
                            $eq: ["$receiverId", "$$uID"],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  friendshipId: "$_id",
                  _id: 0,
                  status: 1,
                  initiatorId: 1,
                  receiverId: 1,
                  profilePhoto: 1,
                },
              },
            ],
            as: "joined",
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$$ROOT",
                {
                  $arrayElemAt: ["$joined", 0],
                },
              ],
            },
          },
        },
        {
          $project: {
            joined: 0,
          },
        },
        {
          $match: {
            status: {
              $ne: 2,
            },
          },
        },
        {
          $project: {
            _id: 0,
            personId: "$_id",
            personName: "$name",
            friendshipStatus: "$status",
            friendshipReceiverId: "$receiverId",
            friendshipInitiatorId: "$initiatorId",
            friendshipId: "$friendshipId",
            profilePhoto: "$profilePhoto",
          },
        },
      ]);

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  register: async function (newUser: User) {
    try {
      const user = await usermodel.create(newUser);
      const result = await user.save();

      return SuccessServiceResult(result);
    } catch (error: unknown) {
      console.log(error)
      if (error instanceof Error && error.name === "MongoServerError")
        return ErrorServiceResult("Email is already registered!");
      return ErrorServiceResult(error);
    }
  },
  login: async function (user: { email: string; password: string }) {
    try {
      const result = await usermodel.findOne({
        email: user.email,
        // password: user.password,
      });
      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  getUser: async function (userId: string) {
    try {
      const result = await usermodel.findOne({
        _id: userId,
      });
      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  changeUsername: async function (editInfo: {
    newUsername: string;
    userId: string;
  }) {
    try {
      const { newUsername, userId } = editInfo;
      const result = await usermodel.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $set: {
            name: newUsername,
          },
        },
        {
          returnDocument: "after",
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  changePassword: async function (changePasswordInfo: {
    oldPassword: string;
    newPassword: string;
    userId: string;
  }) {
    try {
      const { oldPassword, newPassword, userId } = changePasswordInfo;
      let result: any;

      result = await usermodel.findOneAndUpdate(
        {
          _id: userId,
          password: oldPassword,
        },
        {
          $set: {
            password: newPassword,
          },
        },
        {
          returnDocument: "after",
        }
      );
      console.log(" result ", result);
      if (result === null) return ErrorServiceResult("incorrect password!");

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  changeEmail: async function (changeEmailInfo: {
    oldEmail: string;
    newEmail: string;
    userId: string;
    password: string;
  }) {
    try {
      const { oldEmail, newEmail, userId, password } = changeEmailInfo;
      let result: any;
      result = await usermodel.findOne({ email: oldEmail, password });
      if (!result) return ErrorServiceResult("Information incorrect!");

      result = await usermodel.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $set: {
            email: newEmail,
          },
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};
