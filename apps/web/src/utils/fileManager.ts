// utils/fileManager.ts

export interface FileMetadata {
    id: string;
    name: string;
    size: number;
    mime: string;
}

const CHUNK_SIZE = 16 * 1024; // 16KB (Safe for WebRTC)

// 1. SENDER LOGIC: Chop file and send
export async function sendFile(file: File, peers: any[]) {
    const fileId = crypto.randomUUID();
    
    // A. Send Metadata first
    const metadata = {
        type: 'FILE_START',
        payload: {
            id: fileId,
            name: file.name,
            size: file.size,
            mime: file.type
        }
    };

    console.log(metadata)
    
    peers.forEach(p => p.send(JSON.stringify(metadata)));

    // B. Read and Stream Chunks
    const buffer = await file.arrayBuffer();
    let offset = 0;

    function sendNextChunk() {
        while (offset < buffer.byteLength) {
            const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
            
            // Note: In production, send raw binary for speed. 
            // For MVP, JSON wrapping is easier to debug.
            const packet = {
                type: 'FILE_CHUNK',
                payload: {
                    fileId: fileId,
                    data: Array.from(new Uint8Array(chunk)) // Convert to simple array
                }
            };

            peers.forEach(p => p.send(JSON.stringify(packet)));
            offset += CHUNK_SIZE;

            // Pause slightly every 100 chunks to prevent UI freeze
            if (offset % (CHUNK_SIZE * 50) === 0) {
                setTimeout(sendNextChunk, 10);
                return;
            }
        }
        console.log("File Sent Complete");
    }
    
    sendNextChunk();
}

// 2. RECEIVER LOGIC: Memory Buffer
export class IncomingFileManager {
    private buffers: Record<string, Uint8Array[]> = {};
    private metadata: Record<string, FileMetadata> = {};
    private receivedSize: Record<string, number> = {};

    handleMessage(dataStr: string) {
        const msg = JSON.parse(dataStr);

        if (msg.type === 'FILE_START') {
            const { id, name, size, mime } = msg.payload;
            this.buffers[id] = [];
            this.metadata[id] = { id, name, size, mime };
            this.receivedSize[id] = 0;
            return { type: 'START', name };
        }

        if (msg.type === 'FILE_CHUNK') {
            const { fileId, data } = msg.payload;
            const chunk = new Uint8Array(data);
            
            this.buffers[fileId].push(chunk);
            this.receivedSize[fileId] += chunk.byteLength;

            const totalSize = this.metadata[fileId].size;
            const progress = (this.receivedSize[fileId] / totalSize) * 100;

            // Check if complete
            if (this.receivedSize[fileId] >= totalSize) {
                this.saveFile(fileId);
                return { type: 'COMPLETE', fileId };
            }

            return { type: 'PROGRESS', fileId, progress };
        }
    }

    private saveFile(id: string) {
        const blob = new Blob(this.buffers[id], { type: this.metadata[id].mime });
        const url = URL.createObjectURL(blob);
        
        // Auto-download trigger
        const a = document.createElement('a');
        a.href = url;
        a.download = this.metadata[id].name;
        a.click();
        
        // Cleanup memory
        delete this.buffers[id];
    }
}