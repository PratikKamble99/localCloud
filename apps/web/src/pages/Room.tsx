import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Users,
  FileText,
  Download,
  Plus,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import SimplePeer from "simple-peer";
import { socket, sendFileToGroup } from "../config/socket.config";
import { createPeerConnection } from "../config/peer.config";

interface FileMeta {
  id: string;
  name: string;
  size: string;
  senderSocketId?: string;
  senderUsername?: string;
  type: "audio" | "image" | "other";
  timestamp?: number;
}

export function Room() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const peersRef = useRef<Record<string, SimplePeer.Instance>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inComingFile = useRef<any>(null);
  const filesRef = useRef<FileMeta[]>([]);

  function handleIncomingFile(data: FileMeta, user: any) {
    const packet = JSON.parse(data.toString());
    if (packet.type === "FILE_START") {
      const file = {
        ...packet,
        senderSocketId: user.socketId,
        senderUsername: user.username,
        timestamp: Date.now(),
        receivedCount: 0,
        chunks: [],
      };
      inComingFile.current = file;
    } else if (packet.type === "FILE_CHUNK") {
      // Handle file chunk
      if (inComingFile.current) {
        inComingFile.current.chunks[packet.index] = new Uint8Array(packet.data);
        inComingFile.current.receivedCount++;
      }
    }

    if (
      inComingFile.current &&
      inComingFile.current.totalChunks === inComingFile.current.receivedCount
    ) {
      const fileBlob = new Blob(inComingFile.current.chunks || [], {
        type: inComingFile.current.mimeType,
      });

      console.log(inComingFile.current, filesRef.current);
      filesRef.current = filesRef.current.map((file) =>
        file.id === inComingFile.current?.id
          ? {
              ...inComingFile.current,
              blob: fileBlob,
              senderSocketId: user.socketId,
              senderUsername: user.username,
              timestamp: Date.now(),
            }
          : file
      );
      setFiles(filesRef.current);
      inComingFile.current = null;
    }
  }

  useEffect(() => {
    // Get users only first time
    socket.emit("get-users", roomId);

    socket.on("new-user-joined", (user) => {
      if (peersRef.current[user.socketId]) return;

      const peer = createPeerConnection(false);

      // Send our signal to the new user
      peer.on("signal", (signal) => {
        socket.emit("signal", {
          target: user.socketId,
          signal,
        });
      });

      // connect with the new user
      peer.on("connect", () => {
        console.log("✅ Connected to", user.socketId);
      });

      peer.on("data", (data) => {
        handleIncomingFile(data, user);
      });

      peersRef.current[user.socketId] = peer;
      setUsers((prev) => [...prev, user]);
    });

    socket.on("users-list", (users) => {
      setUsers(users);

      // Create peer connections for existing users
      users.forEach((user: any) => {
        if (user.socketId === socket.id) return;
        if (peersRef.current[user.socketId]) return;

        const peer = createPeerConnection(true);

        // Send our signal to the existing user
        peer.on("signal", (signal) => {
          socket.emit("signal", {
            target: user.socketId,
            signal,
          });
        });

        // connect with the existing user
        peer.on("connect", () => {
          console.log("✅ Connected to", user.socketId);
        });

        peer.on("data", (data) => {
          handleIncomingFile(data, user);
        });

        peersRef.current[user.socketId] = peer;
      });
    });

    socket.on("signal", ({ callerId, signal }) => {
      const peer = peersRef.current[callerId];
      if (!peer) {
        console.log("No peer found for caller:", callerId);
        return;
      }

      peer.signal(signal);
    });

    socket.on("file-shared", (file) => {
      console.log("File metadata received:", file);
      // if (filesRef.current.find((f) => f.id === file.id)) return;
      // filesRef.current.push({
      //   ...file,
      //   sender: "Unknown",
      //   timestamp: Date.now(),
      // });
      const updatedFiles = [...files];
      const existingFile = updatedFiles.find((f) => f.id === file.id);

      if (existingFile) {
        updatedFiles.map((f) => {
          if (f.id === file.id) {
            return { ...f, ...file };
          }
          return f;
        });
      } else {
        updatedFiles.push(file);
      }

      console.log("Updated files:", updatedFiles);

      setFiles(updatedFiles);
    });

    return () => {
      socket.emit("leave-room", roomId);
      socket.off("new-user-joined");
      socket.off("users-list");
      socket.off("signal");
      socket.off("file-shared");

      // Clean up peer connections
      Object.values(peersRef.current).forEach((peer) => {
        peer.destroy();
      });
      peersRef.current = {};
    };
  }, [roomId]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: "audio" | "image" | "other" = "other";
    if (file.type.startsWith("audio")) type = "audio";
    if (file.type.startsWith("image")) type = "image";

    const fileId = Math.random().toString(36).substring(2, 15);

    const uploadedFile = {
      id: fileId,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + " MB",
      type,
      senderSocketId: socket.id,
      senderUsername: state.username || "Unknown",
    };

    // 1️⃣ Broadcast metadata via Socket (UI feed)
    socket.emit("file-shared", {
      roomId,
      file: uploadedFile,
    });

    // UPDATE SHARED FILE LIST
    // filesRef.current.push(uploadedFile);
    // console.log(filesRef.current);
    // setFiles(filesRef.current);
    setFiles((prev) => [...prev, uploadedFile]);

    // SEND FILE ON PEERS
    // sendFileToGroup(file, peersRef.current, fileId);
  };

  console.log(files, peersRef.current, users);

  const handleDownload = (file: any) => {
    socket.emit("request-file", {
      roomId,
      fileId: file.id,
    });

    if (!file.blob) return;

    const url = URL.createObjectURL(file.blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* STICKY HEADER */}
      <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="font-bold text-lg tracking-tight text-white">
            {roomId}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            👤 {state?.username} (You) {socket?.id}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-100">
            {users.length}
          </span>
        </div>
      </header>

      {/* FEED (SCROLLABLE) */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {files.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
            <div className="w-20 h-20 border-4 border-dashed border-slate-700 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">No files yet</p>
            <p className="text-sm">Tap + to share</p>
          </div>
        )}

        {files.map((file, i) => (
          <div
            key={i}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800/50 shadow-sm flex items-center justify-between group active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-4">
              {/* Icon Based on Type */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  file.type === "audio"
                    ? "bg-purple-500/10 text-purple-400"
                    : file.type === "image"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-slate-700/30 text-slate-400"
                }`}
              >
                {file.type === "audio" ? (
                  <Music className="w-6 h-6" />
                ) : file.type === "image" ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-200 line-clamp-1 break-all">
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">
                    {file.size}
                  </span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                    {file.senderUsername}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(file)}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 text-blue-400 transition-colors"
            >
              <Download width={20} height={20} />
            </button>
          </div>
        ))}
      </main>

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-8 h-8" />
        </button>
        {/* Hidden Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}
