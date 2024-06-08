import { Request, Response } from "express";
import {
  SuccessResponse,
  ErrorResponse,
  HttpErrorResponse,
} from "../helper/helper";
import jwt from "jsonwebtoken";
import { userService } from "../service/userService";

interface User {
  firstName: String;
  lastName: String;
  email: String;
  phone: String;
  password: String;
}

const userController = {
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
          .json(ErrorResponse("information not completed!"));
      }

      const { data, error } = await userService.register(newUser);
      if (error) return res.status(400).json(ErrorResponse(error.message));

      let token = jwt.sign(
        { _id: data._id, name: data.name },
        process.env.SECRETKEY
      );

      return res.status(201).json({
        token,
        currentUserId: data._id,
        profilePhoto: data.profilePhoto,
      });
    } catch (error) {
      return res.status(500).json(ErrorResponse("Server error!"));
    }
  },

  loginUser: async function (req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const { data, error } = await userService.login({ email, password });

      if (error) return res.status(400).json(ErrorResponse(error.message));

      if (data === null || password !== data.password)
        return res.status(404).json(ErrorResponse("Wrong information! !"));

      let token = jwt.sign(
        { _id: data._id, name: data.name },
        process.env.SECRETKEY
      );

      return res.status(200).json({
        token,
        currentUserId: data._id,
        profilePhoto: data.profilePhoto,
      });
    } catch (error) {
      return res.status(500).json(ErrorResponse(error.message));
    }
  },
  searchPeople: async function (req: Request, res: Response) {
    try {
      const { name, userId } = req.query;

      const result = await userService.searchPeople({
        searchName: name.toString(),
        theUserWhoSearchID: userId.toString(),
      });

      if (result.error) {
        return res.status(404).json(ErrorResponse(result.error.message));
      }

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json(ErrorResponse("unknown error!"));
    }
  },

  getUser: async function (req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const { data, error } = await userService.getUser(userId);

      if (error) return res.status(404).json(ErrorResponse(error.message));

      if (!data) return res.status(404).json(ErrorResponse("Not found!"));

      return res.status(200).json({
        _id: data._id,
        email: data.email,
        name: data.name,
        phone: data.phone,
      });
    } catch (error) {
      return res.status(500).json(ErrorResponse(error.message));
    }
  },
};

export default userController;