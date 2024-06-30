import { Socket } from "socket.io";

interface extra {
  userId: any;
}

const sockets: Map<String, Array<Socket & extra>> = new Map();
const activeUserList = [];
console.log("testing ");

export { sockets, activeUserList, extra };
