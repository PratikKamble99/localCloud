import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import SimplePeer from "simple-peer"; // npm install simple-peer @types/simple-peer
import { socket } from "../config/socket.config";

// Interface for the Peer object we use in the UI
interface PeerNode {
  peerId: string;
  peer: SimplePeer.Instance;
}

export const useWebRTC = (roomId: string) => {
  const [peers, setPeers] = useState<PeerNode[]>([]);
  const peersRef = useRef<PeerNode[]>([]); // Ref to keep track without re-rendering loops

  useEffect(() => {
    socket.on("joined-success", ({ users }) => {
      users.forEach((user: { socketId: string }) => {
        if (user.socketId === socket.id) return;

        const peer = new SimplePeer({
          initiator: true,
          trickle: false,
        });

        peer.on("signal", (offer) => {
          socket.emit("signal", {
            target: user.socketId,
            signal: offer,
          });
        });

        peer.on("connect", () => {
          console.log("P2P connected to", user.socketId);
        });

        peersRef.current.push({ peerId: user.socketId, peer });
        setPeers((prev) => [...prev, { peerId: user.socketId, peer }]);
      });
    });

    socket.on("signal", ({ callerId, signal }) => {
      let peer = peersRef.current.find((p) => p.peerId === callerId);

      if (!peer) {
        const newPeer = new SimplePeer({
          initiator: false,
          trickle: false,
        });

        newPeer.on("signal", (answer) => {
          socket.emit("signal", {
            target: callerId,
            signal: answer,
          });
        });

        newPeer.on("connect", () => {
          console.log("P2P connected to", callerId);
        });

        peersRef.current.push({ peerId: callerId, peer: newPeer });
        return;
      }

      peer.peer.signal(signal);
    });

    return () => {
      // Cleanup connections on unmount
      peersRef.current.forEach((p) => p.peer.destroy());
    };
  }, [roomId]);

  // --- HELPER 1: Create a Peer (Initiator) ---
  function createPeer(
    userToSignal: string,
    callerID: string,
    initiator: boolean
  ) {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false, // Simple setup
    });

    // When my peer generates a signal (SDP), send it to the Server
    peer.on("signal", (signal) => {
      socket.emit("signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  // --- HELPER 2: Add a Peer (Receiver) ---
  function addPeer(incomingSignal: any, callerID: string) {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
    });

    // When I answer, send my signal back to the caller
    peer.on("signal", (signal) => {
      socket.emit("returning-signal", { signal, callerID });
    });

    // Accept their signal
    peer.signal(incomingSignal);

    return peer;
  }

  function sendFile(file: File) {
    // TODO: Implement file sending logic
    console.log("Sending file:", file);
  }

  return { peers, sendFile };
};
