import express from "express";
import dotenv from "dotenv";
import userRoute from "./route/userRoute";
import { db } from "./config/dbConnection";
import friendRoute from "./route/friendRoute";
import { Server } from "socket.io";
import http from "http";
import ioConnection from "./controller/socketController";
import cors from "cors";
import { activeUserList, sockets } from "./utils/store";
import fileRoute from "./route/fileRoute";
import messageRoute from "./route/messageRoute";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/authMiddleware";
import authRoute from "./route/authRoute";
import { fileStoragePath } from "./utils/fileStoragePath";
import setupStorageFolder from "./config/setupFileStorageFolder";
dotenv.config();

const app = express();
const server = http.createServer(app);
const socketio = new Server(server, {
  path: "/io/",
  cors: {
    origin: process.env.WEB_URL,
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.WEB_URL,
    methods: "*",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

db();
setupStorageFolder();
app.use("/resources/chats", express.static(fileStoragePath + "/chats/"));
app.use("/resources/profiles", express.static(fileStoragePath + "/profiles/"));

app.get("/server", (req, res) =>
  res.status(200).json({ message: "server is running!" })
);
app.use("/api", authRoute);

app.use(authMiddleware); //middleware to check authorization of already login user

app.use("/api", userRoute);
app.use("/api", friendRoute);
app.use("/api", fileRoute);
app.use("/api", messageRoute);

ioConnection(socketio, sockets, activeUserList);
console.log(process.env.HOST);

const port = parseInt(process.env.PORT || "4100", 10); // Default to 4100 if PORT is not set
const host = process.env.HOST || "0.0.0.0"; // Default to 0.0.0.0 if HOST is not set

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
