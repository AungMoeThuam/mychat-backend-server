import { mongoose } from "../config/dbConnection";

const messageModel = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
    receiverId: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
    friendshipId: {
      ref: "friendships",
      type: mongoose.Types.ObjectId,
    },
    content: String,
    type: String,
    isDeletedByReceiver: {
      type: Boolean,
      default: false,
    },
    deliveryStatus: {
      type: Number,
      default: 0,
    }, // 0 SENT //1 DELIEVERED //2 SEEN
  },
  { timestamps: true }
);

const messagemodel = mongoose.model("messages", messageModel);

export default messagemodel;
