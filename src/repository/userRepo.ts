import mongoose from "mongoose";
import { usermodel } from "../model/model";

async function findAll() {
  try {
    return await usermodel.find();
  } catch (error) {
    throw new Error(error);
  }
}

export { userRepo };
