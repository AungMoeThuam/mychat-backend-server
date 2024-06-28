import { mongoose } from "../config/dbConnection";

const userModel = new mongoose.Schema(
  {
    name: String,
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    profilePhoto: {
      path: String,
      mimetype: String,
      size: Number,
      createdAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

const usermodel = mongoose.model("users", userModel);

export default usermodel;
