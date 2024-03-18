import { ObjectId, Timestamp } from "mongodb";
import { mongoose } from "../config/dbConnection";
const userModel = new mongoose.Schema({
  name: String,
  email: { type: String, require: true, unique: true },
  password: { type: String, require: true },
  phone: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  profilePhoto: {
    path: String,
    mimetype: String,
    size: Number,
    createdAt: {
      type: Date,
    },
  },
});

const messageModel = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  roomId: {
    ref: "friendships",
    type: mongoose.Types.ObjectId,
  },
  content: String,
  type: String,
  deletedBySender: {
    type: Boolean,
    default: false,
  },
  deletedByReceiver: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  status: {
    type: Number,
    default: 0,
  }, // 0 SENT //1 DELIEVERED //2 SEEN
});

const roomModel = new mongoose.Schema({
  participants: Array,
  type: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const friendshipModel = new mongoose.Schema({
  requester: {
    ref: "users",
    type: mongoose.Types.ObjectId,
  },
  receipent: {
    ref: "users",
    type: mongoose.Types.ObjectId,
  },
  status: {
    type: Number,
    enums: [
      1, // pending
      2, // blocked
      3, //friends
      4, //unfriendhistory
      //5 for refers itself

      // 1, //request
      // 2, //pending
      // 3, // blocked
      // 4, //friends
    ],
  },
  history: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  latestInteractedAt: {
    type: Date,
    default: Date.now(),
  },
  version: {
    type: Number,
    require: true,
  },
});

const usermodel = mongoose.model("users", userModel);
const messagemodel = mongoose.model("messages", messageModel);
const roommodel = mongoose.model("rooms", roomModel);
const friendshipmodel = mongoose.model("friendships", friendshipModel);
export { usermodel, messagemodel, friendshipmodel, roommodel };
