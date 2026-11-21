import SimplePeer from "simple-peer";

export function createPeerConnection(initiator: boolean) {
  const peer = new SimplePeer({
    initiator: initiator, // We are the initiator for existing users
    trickle: true,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    },
  });

  return peer;
}
