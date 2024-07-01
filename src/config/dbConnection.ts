import mongoose from "mongoose";

const url = "mongodb://aungmoethu:my%40chat%40aung@127.0.0.1:27017/mychatapp";
// const url = "mongodb://localhost:27017/mychatapp"

async function db() {
  try {
    await mongoose.connect(url);
    console.log("database connection is running ...! ");
  } catch (error) {
    console.error(error);
  }
}

export { mongoose, db };
