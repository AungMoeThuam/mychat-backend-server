import socketio, { Socket } from "socket.io";
import { extra } from "../store";
import { friendshipmodel, messagemodel } from "../model/model";
import friendshipController from "./friendshipController";
import { mongoose } from "../config/dbConnection";
import Events from "../utils/events";

async function ioConnection(
  ioServer: socketio.Server,
  sockets: Map<String, Array<Socket>>,
  activeUserList: Array<any>
) {
  ioServer.on("connection", (socket: Socket & extra) => {
    // offline or online status events
    socket.on("active", async ({ userId: id }) => {
      const result = await friendshipmodel
        .aggregate([
          {
            $match: {
              $or: [
                {
                  receipent: new mongoose.Types.ObjectId(id),
                  status: 3,
                },
                {
                  requester: new mongoose.Types.ObjectId(id),
                  status: 3,
                },
              ],
            },
          },
          {
            $addFields: {
              friendId: {
                $cond: {
                  if: {
                    $eq: ["$receipent", new mongoose.Types.ObjectId(id)],
                  },
                  then: "$requester",
                  else: "$receipent",
                },
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "friendId",
              foreignField: "_id",
              as: "joined",
              pipeline: [
                {
                  $unset: ["_id", "email", "password", "phone", "createdAt"],
                },
              ],
            },
          },
          {
            $unwind: "$joined",
          },
          {
            $addFields: {
              roomId: "$_id",
              name: "$joined.name",
              profilePhoto: "$joined.profilePhoto",
            },
          },
          {
            $project: {
              joined: 0,
              __v: 0,
              latestInteractedAt: 0,
              createdAt: 0,
            },
          },
          {
            $unwind: {
              path: "$joined",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              friendId: 1,
            },
          },
          {
            $unset: "joined",
          },
        ])
        .sort({ latestInteractedAt: -1 });
      console.log(result);

      const newList = result
        .map((f) => {
          if (activeUserList.filter((s) => s == f.friendId).length === 1) {
            return { ...f, active: true };
          } else return f;
        })
        .filter((item) => item.active === true);
      console.log(newList);

      const isThereAnyUnreadMessages = await messagemodel.find({
        receiverId: id,
        status: 0,
      });

      if (isThereAnyUnreadMessages.length > 0) {
        await messagemodel.updateMany(
          {
            $or: [
              {
                receiverId: id,
                status: 0,
              },
              {
                senderId: id,
                status: 0,
              },
            ],
          },
          {
            status: 1,
          }
        );
      }

      newList.map((item) => {
        console.log(item.friendId.toString());

        sockets.get(item.friendId.toString())?.forEach((sock) =>
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
