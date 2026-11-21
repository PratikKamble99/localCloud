import io from 'socket.io-client';
const SERVER = `${window.location.protocol}//${window.location.hostname}:8000`;

export const socket = io(SERVER);

export const CHUNK_SIZE = 16 * 1024;

export function sendFileToGroup(file: File, peers: any, id: any) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const buffer = event.target?.result;
        const totalChunks = Math.ceil((buffer as ArrayBuffer)?.byteLength / CHUNK_SIZE);

        const metadata = {
            type: 'FILE_START',
            id: id,
            name: file.name,
            size: file.size,
            totalChunks: totalChunks,
            mime: file.type
        };
        broadcast(peers, metadata);

        let offset = 0;
        let chunkIndex = 0;

        function sendNextChunk() {
            while (offset < (buffer as ArrayBuffer)?.byteLength) {
                const chunk = (buffer as ArrayBuffer)?.slice(offset, offset + CHUNK_SIZE);
                
                const packet = {
                    type: 'FILE_CHUNK',
                    fileId: metadata.id,
                    index: chunkIndex,
                    data: Array.from(new Uint8Array(chunk)), // Convert for JSON safety or send raw
                };

                broadcast(peers, packet);
                
                offset += CHUNK_SIZE;
                chunkIndex++;
                
                // Rate limiting: Don't choke the network
                if (chunkIndex % 100 === 0) {
                    setTimeout(sendNextChunk, 10);
                    return;
                }
            }
        }
        sendNextChunk();
    };
    
    reader.readAsArrayBuffer(file);
}

function broadcast(peers: any, data: any) {
    Object.values(peers).forEach((peer: any) => peer.send(JSON.stringify(data)));
}