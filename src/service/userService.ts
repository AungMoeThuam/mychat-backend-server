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
                            $eq: ["$receipent", "$$userId"],
                          },
                          {
                            $eq: ["$requester", "$$uID"],
                          },
                        ],
                      },
                      {
                        $and: [
                          {
                            $eq: ["$requester", "$$userId"],
                          },
                          {
                            $eq: ["$receipent", "$$uID"],
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
                  requester: 1,
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
};
