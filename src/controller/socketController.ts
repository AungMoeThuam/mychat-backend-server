import socketio, { Socket } from "socket.io";
import { extra } from "../store";
import { friendshipmodel, messagemodel } from "../model/model";

async function ioConnection(
  ioServer: socketio.Server,
  sockets: Map<String, Array<Socket>>,
  activeUserList: Array<any>
) {
  ioServer.on("connection", (socket: Socket & extra) => {
    console.log(socket.id);
    console.log("query", socket.handshake.query.userId);
    // let userId = socket.handshake.query.id as string;
    // socket.userId = userId;
    // let length = activeUserList.filter((a) => a == userId).length;

    // if (length == 0) {
    //   activeUserList.push(userId);
    //   sockets.set(userId, [socket]);
    //   socket.broadcast.emit("newActiveUser", activeUserList);
    //   return;
    // } else {
    //   let s: Array<Socket> = sockets.get(userId);

    //   s.push(socket);
    //   sockets.set(userId, s);
    // }

    // offline or online status events
    socket.on("active", ({ userId: id }) => {
      console.log("active - ", id);
      socket.userId = id;
      let length = activeUserList.filter((userId) => userId == id).length;

      if (length == 0) {
        activeUserList.push(id);
        sockets.set(id, [socket]);
        // socket.broadcast.emit("newActiveUser", activeUserList);
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
    socket.on("joinroom", (data) => {
      console.log(data.roomId, " is joined the room");
      socket.join(data.roomId);
    });

    socket.on("message", async (data) => {
      console.log("message", data);

      const res = await messagemodel.create(data);
      const res2 = await friendshipmodel.updateOne(
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
        };
        console.log("value - ", value);
        console.log("message is ", res);

        //emit to users in the room
        ioServer.to(data.roomId).emit("message", newMsg);

        socket.emit("newNotification", newMsg); // emit to the sender itself
        console.log(sockets);
        console.log("ss", sockets.get(data.receiverId));

        //emit to receiver
        sockets.get(data.receiverId)?.forEach((s) => {
          console.log(s.connected);
          s.emit("newmessage", newMsg);
        });
      });

      // socket.emit("message");
    });
    // socket.on("leaveroom", (data) => {});

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
