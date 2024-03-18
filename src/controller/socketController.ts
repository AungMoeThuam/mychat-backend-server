import socketio, { Socket } from "socket.io";
import { extra } from "../store";
import { friendshipmodel, messagemodel } from "../model/model";

async function ioConnection(
  ioServer: socketio.Server,
  sockets: Map<String, Array<Socket>>,
  activeUserList: Array<any>
) {
  ioServer.on("connection", (socket: Socket & extra) => {
    // offline or online status events
    socket.on("active", ({ userId: id }) => {
      console.log("active - ", id);
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
    socket.on("joinroom", (data) => socket.join(data.roomId));

    socket.on("message", async (data) => {
      let activeSocketsOfUser = sockets.get(data.receiverId);
      let isReceiverOffline = true;

      let isInChat = false;
      if (activeSocketsOfUser && activeSocketsOfUser.length > 0) {
        isReceiverOffline = false;
        isInChat = activeSocketsOfUser.every((item) =>
          item.rooms.has(data.roomId)
        );
      }

      let res, res2: any;
      if (isReceiverOffline) {
        //if the receipent user is offline, then status is sent
        res = await messagemodel.create(data);
      } else if (isInChat) {
        //if the receipent user is using the chat with the sender, then status is seen
        res = await messagemodel.create({ ...data, status: 2 });
      } else {
        //if the receipent user is online but not using the chat with sender, the status is delivered
        res = await messagemodel.create({ ...data, status: 1 });
      }

      res2 = await friendshipmodel.updateOne(
        {
          _id: data.roomId,
        },
        {
          latestInteractedAt: Date.now(),
        }
      );
      Promise.all([res, res2]).then((value) => {
        let msg = value[0];
        let newMsg = {
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          roomId: msg.roomId,
          content: msg.content,
          type: msg.type,
          deletedBySender: msg.deletedBySender,
          deletedByReceiver: msg.deletedByReceiver,
          createdAt: msg.createdAt,
          messageId: msg._id,
          status: msg.status,
        };

        //emit to users in the room
        ioServer.to(data.roomId).emit("message", newMsg);

        socket.emit("newNotification", newMsg); // emit to the sender itself

        //emit to receiver
        sockets
          .get(data.receiverId)
          ?.forEach((s) => s.emit("newmessage", newMsg));
      });

      // socket.emit("message");
    });

    // socket.on("leaveroom", (data) => {});
    socket.on("leave_room_event", (roomId) => {
      console.log("leave");
      socket.leave(roomId);
    });

    //socket showing typing events when chatting
    socket.on("start-typing", (data) => {
      sockets
        .get(data.friendId)
        ?.forEach((socket) => socket.emit("start-typing"));
    });
    socket.on("stop-typing", (data) => {
      sockets
        .get(data.friendId)
        ?.forEach((socket) => socket.emit("stop-typing"));
    });

    //socket on disconnect
    socket.on("disconnect", () => {
      console.log("disconnected", socket.id, " - ", socket.userId);
      let activeSocketsOfUser = sockets.get(socket.userId);

      if (activeSocketsOfUser) {
        if (activeSocketsOfUser.length > 1) {
          activeSocketsOfUser = activeSocketsOfUser.filter(
            (s: any) => s.id != socket.id
          );
          sockets.set(socket.userId, activeSocketsOfUser);
        } else {
          socket.broadcast.emit(
            "newOfflineUser",
            activeUserList.filter((i) => i === socket.userId)
          );
          socket.broadcast.emit("newOfflineUser", {
            userId: socket.userId,
            active: false,
          });
          sockets.delete(socket.userId);
          activeUserList.splice(activeUserList.indexOf(socket.userId), 1);
        }
      }
    });
  });
}

export default ioConnection;
