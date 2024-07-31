import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const url = `mongodb://127.0.0.1:27017/${process.env.DB_NAME}`;

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
