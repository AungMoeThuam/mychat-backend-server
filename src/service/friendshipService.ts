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
  friendshipId: string;
}

interface UnFriendActionParameter {
  friendId: string;
  userId: string;
  friendshipId?: string;
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
      });

      if (result == null || result.status !== 3) {
        return ErrorServiceResult(
          "He is no longer your friend! Try add friend to have a conversation!"
        );
      }

      const isFriend =
        result.receiverId == currentUserId ||
        result.initiatorId == currentUserId;

      if (isFriend === false)
        return ErrorServiceResult("You are not friend with him!");

      let friId =
        result.receiverId == currentUserId
          ? result.initiatorId
          : result.receiverId;
      result = await usermodel.findOne(
        {
          _id: friId,
        },
        { email: 0, password: 0, phone: 0, __v: 0 }
      );

      return SuccessServiceResult(result);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },

  request: async function (requestServiceParameter: FriendshipActionParameter) {
    const { requesterId, receipentId, friendshipId } = requestServiceParameter;
    let result: any;

    try {
      result = await friendshipmodel.findOne({
        $or: [
          {
            initiatorId: requesterId,
            receiverId: receipentId,
          },
          {
            initiatorId: receipentId,
            receiverId: requesterId,
          },
        ],
        status: { $in: [1, 4, 2] },
      });

      if (result == null) {
        result = await friendshipmodel.create({
          receiverId: receipentId,
          initiatorId: requesterId,
          status: 1,
        });
      } else if (result.status === 1 || result.status === 2) {
        return ErrorServiceResult("cannot process the request at the moment!");
      } else {
        result = await friendshipmodel.updateOne(result, {
          $set: {
            receiverId: receipentId,
            initiatorId: requesterId,
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
    const { receipentId, requesterId, friendshipId } = acceptServiceParameter;
    let result: any;

    try {
      console.log(friendshipId);
      result = await friendshipmodel.findOne({
        _id: friendshipId,
        status: 1,
      });
      if (result === null) {
        return ErrorServiceResult(
          "There is a conflict friend action! try refresh!"
        );
      }
      result = await friendshipmodel.updateOne(
        {
          _id: friendshipId,
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
    const { requesterId, receipentId, friendshipId } = rejectServiceParameter;
    let result: any;
    try {
      console.log(friendshipId);
      result = await friendshipmodel.findOne({
        _id: friendshipId,
      });

      if (result == null || result.status === 3)
        return ErrorServiceResult(
          `There is b a conflict concurrent request! try refresh! `
        );

      if (result.status !== 4)
        result = await friendshipmodel.deleteOne({
          _id: friendshipId,
        });
      else
        result = await friendshipmodel.updateOne(
          {
            _id: friendshipId,
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
    const { friendId, userId, friendshipId } = unfriendServiceParameter;
    let result: any;
    try {
      result = await friendshipmodel.findOne({
        status: 3,
        _id: friendshipId,
      });
      if (result === null) {
        return ErrorServiceResult(
          "there is a conflict concurrent request at the moment! try refresh!"
        );
      }
      result = await friendshipmodel.updateOne(
        {
          _id: friendshipId,
        },
        {
          $set: {
            status: 4,
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
      result = await friendshipmodel.findOne({
        _id: friendshipId,
      });

      if (result !== null && result.status === 2)
        return ErrorServiceResult(
          `There is b a conflict concurrent request! try refresh! `
        );

      if (!result) {
        result = await friendshipmodel.create({
          receiverId: currentUserId,
          status: 2,
          initiatorId: friendId,
        });
        return SuccessServiceResult(result);
      }

      if (result.receiverId.toString() === currentUserId) {
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
        let oldReceipent = result.receiverId;
        result = await friendshipmodel.updateOne(
          {
            _id: result._id,
          },
          {
            $set: {
              receiverId: currentUserId,
              initiatorId: oldReceipent,
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
      result = await friendshipmodel.findOne({
        _id: friendshipId,
      });
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
