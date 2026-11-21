import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import os from "os";

import fs from 'fs';
import https from 'https';

const options = {
  key: fs.readFileSync('../certs/192.168.1.26+2-key.pem'),
  cert: fs.readFileSync('../certs/192.168.1.26+2.pem'),
};

const PORT = 8000;

interface User {
  socketId: string;
  username: string;
}

interface FileMeta {
  name: string;
  size: number;
  type?: string;
  sender?: string;
  timestamp?: number;
}

interface Room {
  password: string;
  users: User[];
  files: FileMeta[];
}

interface JoinRoomPayload {
  roomId: string;
  password: string;
  username: string;
}

interface SignalPayload {
  target: string;
  signal: any;
}

interface SocketSession {
  username: string;
  roomId: string;
}

// ---------- HELPERS ----------
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  return "localhost";
}

const LOCAL_IP = getLocalIp();

// ---------- SERVER SETUP ----------
const app: Application = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

const httpServer = https.createServer(options, app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ---------- IN-MEMORY STORAGE ----------
const rooms: Record<string, Room> = {};

// ---------- SOCKET LOGIC ----------
io.on("connection", (socket) => {
  console.log(`🔌 New Device Connected: ${socket.data}`);

  socket.on("get-users", (roomId) => {
    const room = rooms[roomId];
    if (room) {
      console.log("Get users", socket.id, room.users);
      socket.emit("users-list", room.users);
    }
  });

  socket.on("join-room", ({ roomId, password, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        password,
        users: [],
        files: [],
      };
    }

    const room = rooms[roomId];

    if (room.password !== password) {
      socket.emit("error-msg", "Wrong password");
      return;
    }

    socket.join(roomId);

    room.users.push({
      socketId: socket.id,
      username,
    });

    // 🔹 Send success to new joiner
    socket.emit("joined-success", {
      room_id: roomId,
    });

    // 🔹 Send current user list to new joiner
    socket.emit("users-list", room.users);

    // 🔹 Notify existing users about new user
    socket.to(roomId).emit("new-user-joined", {
      socketId: socket.id,
      username,
    });

    console.log(`✅ ${username} joined ${roomId}`);
  });

  socket.on("signal", ({ target, signal }) => {
    io.to(target).emit("signal", {
      callerId: socket.id,
      signal,
    });
  });

  socket.on("file-shared", ({ roomId, file }) => {
    const room = rooms[roomId];
    if (room) {
      const fileWithTimestamp = { ...file, timestamp: Date.now() };
      room.files.push(fileWithTimestamp);
      io.to(roomId).emit("file-shared", fileWithTimestamp);
    }else{
      console.error("Room not found", roomId);
      socket.emit("error-msg", "Room not found");
    }
  });

  socket.on("request-file",({roomId,fileId}) => {
    
  })

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    const room = rooms[roomId];
    if (room) {
      room.users = room.users.filter((user) => user.socketId !== socket.id);
      // Notify remaining peers
      socket.to(roomId).emit("users-list", room.users);
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 ${socket.id} disconnected`);
    // Clean up user from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter((user) => user.socketId !== socket.id);
      if (room.users.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room ${roomId} deleted (Empty)`);
      } else {
        socket.to(roomId).emit("users-list", room.users);
      }
    }
  });
});

// ---------- START SERVER ----------
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 LOCAL CLOUD SERVER STARTED!`);
  console.log(`-----------------------------------------------`);
  console.log(`🌐 Local Access:   http://localhost:${PORT}`);
  console.log(`📱 Network Access: http://${LOCAL_IP}:${PORT}`);
  console.log(`-----------------------------------------------\n`);
});
