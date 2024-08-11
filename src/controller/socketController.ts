import socketio, { Socket } from "socket.io";
import { extra } from "../utils/store";
import Events from "../utils/events";
import { friendshipService } from "../service/friendshipService";
import friendshipmodel from "../model/friendshipModel";
import messagemodel from "../model/messageModel";
import { mongoose } from "../config/dbConnection";
import userController from "./userController";

async function ioConnection(
  ioServer: socketio.Server,
  sockets: Map<String, Array<Socket>>,
  activeUserList: Array<any>
) {
  ioServer.on("connection", (socket: Socket & extra) => {
    // offline or online status events
    socket.on("active", async ({ userId: id }) => {
      let result = await userController.getConversationList(id);

      result = result.map((user) => ({ friendId: user.friendId.toString() }));

      const newList = result
        .map((f) => {
          if (activeUserList.filter((s) => s == f.friendId).length === 1) {
            return { ...f, active: true };
          } else return f;
        })
        .filter((item) => item.active === true);

      const isThereAnyUnreadMessages = await messagemodel.find({
        receiverId: id,
        deliveryStatus: 0,
      });

      if (isThereAnyUnreadMessages.length > 0) {
        await messagemodel.updateMany(
          {
            $or: [
              {
                receiverId: id,
                deliveryStatus: 0,
              },
              {
                senderId: id,
                deliveryStatus: 0,
              },
            ],
          },
          {
            deliveryStatus: 1,
          }
        );
      }

      newList.map((item) => {
        sockets.get(item.friendId)?.forEach((sock) =>
          sock.emit(Events.MESSAGE_STATUS_DELIVERED, {
            friendId: id,
          })
        );
      });

      socket.userId = id;
      let length = activeUserList.filter((userId) => userId == id).length;

      if (length == 0) {
        activeUserList.push(id);
        sockets.set(id, [socket]);
        socket.broadcast.emit("newActiveUser", {
          userId: id,
          active: true,
        });
        return;
      }

      let s: Array<Socket> = sockets.get(id);

      s.push(socket);
      sockets.set(id, s);
    });

    //chating events
    socket.on("joinroom", async (data) => {
      const { roomId, userId, friendId } = data;
      console.log("join-room ", data);
      socket.join(roomId);

      //getting unreadmessage count of the user who just joins the chat with his friend
      const unreadMessageCount = await messagemodel.find({
        friendshipId: new mongoose.Types.ObjectId(roomId),
        receiverId: new mongoose.Types.ObjectId(userId),
        deliveryStatus: {
          $in: [0, 1],
        },
      });

      console.log(" seen ", unreadMessageCount);
      if (unreadMessageCount.length > 0) {
        //if there is a count of unread messages, then update all of them into seen status
        await messagemodel.updateMany(
          {
            friendshipId: new mongoose.Types.ObjectId(roomId),
            receiverId: new mongoose.Types.ObjectId(userId),
            deliveryStatus: {
              $in: [0, 1],
            },
          },
          {
            deliveryStatus: 2,
          }
        );

        console.log("sockets ", sockets);
        console.log("there is a count ", sockets.get(friendId));
        //then emit the event to inform the friend that the unread message are now seen by the user who just joins the chat
        sockets
          .get(friendId)
          ?.forEach((sock) => sock.emit(Events.MESSAGE_STATUS_SEEN));
      }
    });

    socket.on("call", (data) => {
      const { calleeId } = data;
      sockets?.get(calleeId)?.forEach((e) => e.emit("call", data));
    });

    socket.on("answer", (data) => {
      const { callerId } = data;
      sockets?.get(callerId)?.forEach((e) => e.emit("answer", data));
    });

    socket.on("end-call", ({ targetUserId }) => {
      sockets?.get(targetUserId)?.forEach((e) => e.emit("end-call"));
    });

    socket.on("turn-off-video", (data) => {
      const { targetUserId } = data;
      sockets.get(targetUserId)?.forEach((e) => e.emit("turn-off-video"));
    });

    socket.on("turn-on-video", (data) => {
      const { targetUserId } = data;
      sockets.get(targetUserId)?.forEach((e) => e.emit("turn-on-video"));
    });

    socket.on("message", async (data) => {
      const result = await friendshipService.checkFriendOrNot(
        data.friendshipId,
        data.receiverId,
        data.senderId
      );

      if (result.error)
        return socket.emit("error", {
          status: "error",
          message: result.error,
        });
      let activeSocketsOfUser = sockets.get(data.receiverId);
      let isReceiverOffline = true;

      let isInChat = false;
      if (activeSocketsOfUser && activeSocketsOfUser.length > 0) {
        isReceiverOffline = false;
        isInChat = activeSocketsOfUser.every((item) =>
          item.rooms.has(data.friendshipId)
        );
      }
      let temporaryMessageId = data.temporaryMessageId;
      delete data.temporaryMessageId;
      let validateMessage = { ...data };

      let res: any;
      if (isReceiverOffline) {
        //if the receipent user is offline, then status is sent
        res = await messagemodel.create(validateMessage);
      } else if (isInChat) {
        //if the receipent user is using the chat with the sender, then status is seen
        res = await messagemodel.create({
          ...validateMessage,
          deliveryStatus: 2,
        });
      } else {
        //if the receipent user is online but not using the chat with sender, the status is delivered
        res = await messagemodel.create({
          ...validateMessage,
          deliveryStatus: 1,
        });
      }

      Promise.all([res]).then((value) => {
        let msg = value[0];
        let newMsg = {
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          friendshipId: msg.friendshipId,
          content: msg.content,
          type: msg.type,
          isDeletedByReceiver: msg.isDeletedByReceiver,
          createdAt: msg.createdAt,
          messageId: msg._id,
          deliveryStatus: msg.deliveryStatus,
          temporaryMessageId,
        };

        //emit to users in the room
        ioServer.to(data.friendshipId.toString()).emit(Events.MESSAGE, newMsg);

        // socket.emit("message-sending-status", {
        //   status: "success",
        //   temporaryMessageId: temporaryMessageId,
        // });

        socket.emit("newNotification", newMsg); // emit to the sender itself

        //emit to receiver
        sockets
          .get(data.receiverId)
          ?.forEach((s) => s.emit("newmessage", newMsg));
      });

      // socket.emit("message");
    });

    // socket.on("leaveroom", (data) => {});
    socket.on("leave_room_event", (roomId) => socket.leave(roomId));

    //socket showing typing events when chatting
    socket.on(Events.START_TYPING, (data) =>
      socket.in(data.roomId).emit(Events.START_TYPING)
    );
    socket.on(Events.STOP_TYPING, (data) =>
      socket.in(data.roomId).emit(Events.STOP_TYPING)
    );

    //socket on disconnect
    socket.on("disconnect", () => {
      //getting the current active sockets of that disconnected user
      let activeSocketsOfUser = sockets.get(socket.userId);

      //checking whether the disconnected user has active sockets
      if (activeSocketsOfUser) {
        //checking whether the disconnected user has more than 1  active socket
        if (activeSocketsOfUser.length > 1) {
          //if so, then remove the disconnected socket
          activeSocketsOfUser = activeSocketsOfUser.filter(
            (s: any) => s.id != socket.id
          );

          //set the actice sockets of that user with updated actice sockets list
          sockets.set(socket.userId, activeSocketsOfUser);
        } else {
          // if the disconnected user has empty active sockets,
          // then remove the user from actice users list

          //emiting events to all the other actice users to inform that disconnected user
          socket.broadcast.emit("newOfflineUser", {
            userId: socket.userId,
            active: false,
          });

          //removing the the map key pair that store the active sockets of that user
          sockets.delete(socket.userId);

          //removing that user from actice user list
          activeUserList.splice(activeUserList.indexOf(socket.userId), 1);
        }
      }
    });
  });
}

export default ioConnection;
