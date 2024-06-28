import { mongoose } from "../config/dbConnection";

const friendshipModel = new mongoose.Schema(
  {
    initiatorId: {
      ref: "users",
      type: mongoose.Types.ObjectId,
    },
    receiverId: {
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
  },
  {
    timestamps: true,
  }
);

const friendshipmodel = mongoose.model("friendships", friendshipModel);
export default friendshipmodel;
