import { mongoose } from "../config/dbConnection";

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

const friendshipmodel = mongoose.model("friendships", friendshipModel);
export default friendshipmodel;
