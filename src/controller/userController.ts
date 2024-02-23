import { friendshipmodel, usermodel } from "../model/model";
import { Request, Response } from "express";
import {
  SuccessMResponse,
  ErrorMResponse,
  Status,
  SuccessResponse,
  ErrorResponse,
} from "../helper/helper";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

interface User {
  firstName: String;
  lastName: String;
  email: String;
  phone: String;
  password: String;
}

const userController = {
  getAllUser: async function (req: Request, res: Response) {
    try {
      const users = await usermodel.find();
      const response: SuccessMResponse = {
        status: Status.Success,
        data: users,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ErrorMResponse = {
        status: Status.Failed,
        reason: "server error!",
      };
      res.status(500).json(response);
    }
  },

  registerUser: async function (req: Request, res: Response) {
    try {
      let validate = true;
      if (Object.keys(req.body).length === 0) {
        validate = false;
      }
      const newUser: User = req.body;

      for (const a in newUser) {
        if (a != "phone" && !newUser[a].trim()) validate = false;
      }

      if (!validate) {
        return res
          .status(400)
          .json(ErrorResponse(101, "information not completed!"));
      }

      const user = await usermodel.create(newUser);
      const result = await user.save();
      let token = jwt.sign(
        { _id: result._id, name: result.name },
        process.env.SECRETKEY
      );

      return res.status(201).json(
        SuccessResponse(
          {
            token,
            currentUserId: result._id,
            profilePhoto: result.profilePhoto,
          },
          "Login successful!"
        )
      );
    } catch (error) {
      if (error.code == 11000) {
        return res
          .status(409)
          .json(ErrorResponse(101, "email is already existed!"));
      }

      return res.status(500).json(ErrorResponse(101, "Server error!"));
    }
  },

  loginUser: async function (req: Request, res: Response) {
    try {
      const user = req.body;
      console.log(user);
      const result = await usermodel.findOne({
        email: user.email,
        // password: user.password,
      });

      console.log(result);

      if (result === null) {
        res.status(404).json(ErrorResponse(101, "Email is incorrect!"));
        return;
      }
      if (result.password !== user.password) {
        res.status(404).json(ErrorResponse(101, "Password is incorrect"));
        return;
      }

      let token = jwt.sign(
        { _id: result._id, name: result.name },
        process.env.SECRETKEY
      );
      console.log(process.env.SECRETKEY);

      console.log("success");

      res.status(200).json(
        SuccessResponse(
          {
            token,
            currentUserId: result._id,
            profilePhoto: result.profilePhoto,
          },
          "Login successful!"
        )
      );
    } catch (error) {
      res.status(500).json(ErrorResponse(101, error.message));
    }
  },
  searchPeople: async function (req: Request, res: Response) {
    try {
      const { name, userId } = req.query;
      const uID = new mongoose.Types.ObjectId(userId.toString());
      const result = await usermodel.aggregate([
        {
          $match: {
            name: {
              $regex: `.*${name}.*`,
              $options: "i",
            },
          },
        },
        {
          $lookup: {
            from: "friendships",
            let: {
              userId: "$_id",
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
                            $eq: ["$requester", uID],
                          },
                        ],
                      },
                      {
                        $and: [
                          {
                            $eq: ["$requester", "$$userId"],
                          },
                          {
                            $eq: ["$receipent", uID],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  friendshipId: "$_id",
                  // status: 1,
                  // requester: 1,
                  // version: 1,
                },
              },
            ],
            as: "joined",
          },
        },
        // {
        //   $replaceRoot: {
        //     newRoot: {
        //       $mergeObjects: [
        //         "$$ROOT",
        //         {
        //           $arrayElemAt: ["$joined", 0],
        //         },
        //       ],
        //     },
        //   },
        // },
        // {
        // $project: {
        //   email: 0,
        //   password: 0,
        //   phone: 0,
        // joined: 0,
        // },
        // },
      ]);

      res.status(200).json(SuccessResponse(result, "success 1 fetched!"));
    } catch (error) {
      res.status(404).json(error);
    }
  },

  getFriendList: async function (req: Request, res: Response) {},
};

export default userController;
