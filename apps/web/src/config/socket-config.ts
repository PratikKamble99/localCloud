import io from 'socket.io-client';
import crypto from 'crypto';
// Auto-detects the server URL (e.g., http://192.168.1.5:3000)
const SERVER = `${window.location.protocol}//${window.location.hostname}:8000`;

export const socket = io(SERVER);

// A Generic "File Sender" Class

const CHUNK_SIZE = 16 * 1024; // 16KB (Safe limit for WebRTC)

export function sendFileToGroup(file: File, peers: any) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const buffer = event.target?.result;
        const totalChunks = Math.ceil((buffer as ArrayBuffer)?.byteLength / CHUNK_SIZE);

        // 1. Tell everyone: "Incoming File!"
        const metadata = {
            type: 'FILE_START',
            id: Math.random().toString(36).substring(2, 15),
            name: file.name,
            size: file.size,
            totalChunks: totalChunks,
            mime: file.type
        };
        console.log(peers)
        broadcast(peers, metadata);

        // 2. Start sending chunks
        let offset = 0;
        let chunkIndex = 0;

        function sendNextChunk() {
            while (offset < (buffer as ArrayBuffer)?.byteLength) {
                const chunk = (buffer as ArrayBuffer)?.slice(offset, offset + CHUNK_SIZE);
                
                // Wrap generic data in a packet
                const packet = {
                    type: 'FILE_CHUNK',
                    fileId: metadata.id,
                    index: chunkIndex,
                    data: Array.from(new Uint8Array(chunk)) // Convert for JSON safety or send raw
                };
                
                broadcast(peers, packet);
                
                offset += CHUNK_SIZE;
                chunkIndex++;
                
                // Rate limiting: Don't choke the network
                if (chunkIndex % 100 === 0) {
                    setTimeout(sendNextChunk, 10); // Breathe every 100 chunks
                    return;
                }
            }
        }
        sendNextChunk();
    };
    
    reader.readAsArrayBuffer(file);
}

function broadcast(peers: any, data: any) {
    peers.forEach((peer: any) => peer.send(JSON.stringify(data)));
}