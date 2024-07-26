import express from "express";
import dotenv from "dotenv";
import userRoute from "./route/userRoute";
import { db } from "./config/dbConnection";
import friendRoute from "./route/friendRoute";
import { Server } from "socket.io";
import http from "http";
import ioConnection from "./http-controller/socketController";
import cors from "cors";
import { activeUserList, sockets } from "./store";
import fileRoute from "./route/fileRoute";
import messageRoute from "./route/messageRoute";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/authMiddleware";
import authRoute from "./route/authRoute";
import compression from "compression";
dotenv.config();

const app = express();
const server = http.createServer(app);
const socketio = new Server(server, {
  path: "/io/",
  cors: {
    origin: "*",
    credentials: true,
  },
});
// app.use(compression({ level: 9, threshold: 0 }));
// app.use(
//   compression({
//     filter: function () {
//       return true;
//     },
//   })
// );
app.use(
  cors({
    origin: "*",
    methods: "*",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/resources/chats", express.static(__dirname + "/storage/chats"));
app.use("/resources/profiles", express.static(__dirname + "/storage/profiles"));

db();

app.get("/server", (req, res) => {
  return res.status(200).json({ message: "server is running!" });
});

app.post("/api", async (req, res) => {
  res.json({ message: req.body });
});

app.use("/api", authRoute);

app.use(authMiddleware); //middleware to check authorization of already login user

app.use("/api", userRoute);
app.use("/api", friendRoute);
app.use("/api", fileRoute);
app.use("/api", messageRoute);

ioConnection(socketio, sockets, activeUserList);

// setInterval(() => {
//   console.log("active socket - ", sockets);
//   console.log("active user - ", activeUserList);
// }, 2000);

server.listen(4000, () => console.log("server is runing ...!"));
