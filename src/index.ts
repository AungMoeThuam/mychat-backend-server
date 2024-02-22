import express from "express";
import dotenv from "dotenv";
import userRoute from "./route/userRoute";
import { db } from "./config/dbConnection";
import friendRoute from "./route/friendRoute";
import { Server } from "socket.io";
import http from "http";
import ioConnection from "./controller/socketController";
import cors from "cors";
import { activeUserList, sockets } from "./store";
import fileRoute from "./route/fileRoute";
import messageRoute from "./route/messageRoute";
import cookieParser from "cookie-parser";
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
app.use(
  cors({
    origin: "*",
    methods: "*",
    credentials: true,
  })
);

console.log("process", process.env.DB_URL);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const { cookie } = req.headers;
  console.log("cookie - ", req.cookies);
  console.log("cookie headers - ", cookie);

  next();
});
app.use("/resources/chats", express.static(__dirname + "/storage/chats"));
app.use("/resources/profiles", express.static(__dirname + "/storage/profiles"));

db();

app.get("/", async (req, res) => {
  console.log("main pint");
  res.json({ message: "hello" });
});
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
