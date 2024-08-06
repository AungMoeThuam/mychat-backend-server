import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const url = `${process.env.DB_URL}/${process.env.DB_NAME}`;

async function db() {
  try {
    await mongoose.connect(url, {
      user: process.env.DB_USERNAME,
      pass: process.env.DB_PASSWORD,
    });
    console.log("database connection is running successfully ...! ");
  } catch (error) {
    console.error(error);
  }
}

export { mongoose, db };
