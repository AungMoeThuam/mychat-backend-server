import { mongoose } from "../config/dbConnection";
import friendshipmodel from "../model/friendshipModel";
import usermodel from "../model/userModel";
import {
  ErrorServiceResult,
  SuccessServiceResult,
} from "../utils/serviceResult";

interface FriendshipActionParameter {
  requesterId: string;
  receipentId: string;
}

interface UnFriendActionParameter {
  friendId: string;
  userId: string;
}

interface BlockServiceParameter {
  friendshipId: string;
  currentUserId: string;
  friendId: string;
}

interface UnblockServiceParameter {
  friendshipId: string;
  currentUserId: string;
}

export const friendshipService = {
  checkFriendOrNot: async function (
    roomId: string,
    friendId: string,
    currentUserId: string
  ) {
    try {
      let result = await friendshipmodel.findOne({
        _id: roomId,
        $or: [
          {
            receipent: currentUserId,
          },
          {
            requester: currentUserId,
          },
        ],
      });

      if (result == null || result.status !== 3) {
        return ErrorServiceResult(
          "He is no longer your friend! Try add friend to have a conversation!"
        );
      }

      const isFriend =
        result.receipent == currentUserId || result.requester == currentUserId;

      if (isFriend === false)
        return ErrorServiceResult("You are not friend with him!");

      result = await usermodel.findOne(
        {
          _id: friendId,
        },
        { email: 0, password: 0, phone: 0, __v: 0 }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },

  request: async function (requestServiceParameter: FriendshipActionParameter) {
    const { requesterId, receipentId } = requestServiceParameter;
    let result: any;

    try {
      result = await friendshipmodel.findOne({
        $or: [
          {
            requester: requesterId,
            receipent: receipentId,
          },
          {
            requester: receipentId,
            receipent: requesterId,
          },
        ],
        status: { $in: [1, 4, 2] },
      });

      if (result == null) {
        result = await friendshipmodel.create({
          receipent: receipentId,
          requester: requesterId,
          status: 1,
          version: Date.now(),
        });
      } else if (result.status === 1 || result.status === 2) {
        return ErrorServiceResult("cannot process the request at the moment!");
      } else {
        result = await friendshipmodel.updateOne(result, {
          $set: {
            receipent: receipentId,
            requester: requesterId,
            status: 1,
          },
        });
      }

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  accept: async function (acceptServiceParameter: FriendshipActionParameter) {
    const { receipentId, requesterId } = acceptServiceParameter;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        receipent: receipentId,
        requester: requesterId,
        status: 1,
      });
      if (result === null) {
        return ErrorServiceResult(
          "There is a conflict friend action! try refresh!"
        );
      }
      result = await friendshipmodel.updateOne(
        {
          receipent: receipentId,
          requester: requesterId,
        },
        {
          $set: {
            status: 3,
          },
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  reject: async function (rejectServiceParameter: FriendshipActionParameter) {
    const { requesterId, receipentId } = rejectServiceParameter;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        $or: [
          {
            receipent: receipentId,
            requester: requesterId,
            history: true,
          },
          {
            receipent: receipentId,
            requester: requesterId,
            history: false,
          },
        ],
      });
      console.log("reject - ", result);
      if (result == null || result.status === 3)
        return ErrorServiceResult(
          `There is b a conflict concurrent request! try refresh! `
        );

      if (result.history !== true)
        result = await friendshipmodel.deleteOne({
          receipent: receipentId,
          requester: requesterId,
        });
      else
        result = await friendshipmodel.updateOne(
          {
            receipent: receipentId,
            requester: requesterId,
          },
          {
            $set: {
              status: 4,
            },
          }
        );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  unfriend: async function (unfriendServiceParameter: UnFriendActionParameter) {
    const { friendId, userId } = unfriendServiceParameter;
    let result: any;
    console.log(friendId, " - ", userId);
    try {
      result = await friendshipmodel.findOne({
        status: 3,
        $or: [
          { receipent: userId, requester: friendId },
          { receipent: friendId, requester: userId },
        ],
      });
      if (result === null) {
        return ErrorServiceResult(
          "there is a conflict concurrent request at the moment! try refresh!"
        );
      }
      result = await friendshipmodel.updateOne(
        {
          $or: [
            { receipent: userId, requester: friendId },
            { receipent: friendId, requester: userId },
          ],
        },
        {
          $set: {
            status: 4,
            history: true,
          },
        }
      );

      return SuccessServiceResult(result);
    } catch (error: any) {
      return ErrorServiceResult(error.message);
    }
  },
  block: async function (blockServiceParameter: BlockServiceParameter) {
    const { friendshipId, currentUserId, friendId } = blockServiceParameter;
    let result: any;
    try {
      console.log(friendId, " - ff - ", currentUserId);
      result = await friendshipmodel.findOne({
        _id: friendshipId,
      });

      console.log(result);
      console.log(
        "operation is true ",
        result?.receipent ==
          new mongoose.Types.ObjectId(currentUserId).toString()
      );
      if (result !== null && result.status === 2)
        return ErrorServiceResult(
          `There is b a conflict concurrent request! try refresh! `
        );

      if (!result) {
        result = await friendshipmodel.create({
          receipent: currentUserId,
          status: 2,
          requester: friendId,
        });
        return SuccessServiceResult(result);
      }

      if (result.receipent.toString() === currentUserId) {
        console.log("operation is true");
        result = await friendshipmodel.updateOne(
          {
            _id: result._id,
          },
          {
            $set: {
              status: 2,
            },
          }
        );
      } else {
        let oldReceipent = result.receipent;
        result = await friendshipmodel.updateOne(
          {
            _id: result._id,
          },
          {
            $set: {
              receipent: currentUserId,
              requester: oldReceipent,
              status: 2,
            },
          }
        );
      }

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
  unblock: async function (blockServiceParameter: UnblockServiceParameter) {
    const { friendshipId, currentUserId } = blockServiceParameter;
    let result: any;
    try {
      console.log(friendshipId, " - ff - ", currentUserId);
      result = await friendshipmodel.findOne({
        _id: friendshipId,
      });
      console.log(result);
      if (result !== null && result.status === 4)
        return ErrorServiceResult(
          `There is a conflict concurrent request! try refresh! `
        );

      result = await friendshipmodel.updateOne(
        {
          _id: result._id,
        },
        {
          $set: {
            status: 4,
          },
        }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};
