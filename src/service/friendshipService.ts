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
        status: { $in: [1, 4] },
      });

      if (result == null) {
        result = await friendshipmodel.create({
          receipent: receipentId,
          requester: requesterId,
          status: 1,
          version: Date.now(),
        });
      } else if (result.status === 1) {
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
            status: 4,
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
          history: true,
          status: 4,
        }
      );

      return SuccessServiceResult(result);
    } catch (error: any) {
      return ErrorServiceResult(error.message);
    }
  },
};
