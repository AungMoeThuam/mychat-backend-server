import { mongoose } from "../config/dbConnection";

const messageModel = new mongoose.Schema(
  {
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
    status: {
      type: Number,
      default: 0,
    }, // 0 SENT //1 DELIEVERED //2 SEEN
  },
  { timestamps: true }
);

const messagemodel = mongoose.model("messages", messageModel);

export default messagemodel;
