import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone'; // npm install react-dropzone
import { sendFile, IncomingFileManager } from '../utils/fileManager';

export function DropZone({ peers }: { peers: any[] }) {
    const [transfers, setTransfers] = useState<any[]>([]); // To show progress bars
    const incomingManager = useRef(new IncomingFileManager());

    // 1. Listen for Incoming Data
    useEffect(() => {
        peers.forEach(peer => {
            peer.on('data', (data: any) => {
                const status = incomingManager.current.handleMessage(data.toString());
                
                if (status?.type === 'PROGRESS') {
                    // Update Progress UI (Implementation left to you)
                    console.log(`Downloading... ${status.progress}%`);
                }
            });
        });
    }, [peers]);

    // 2. Handle Drag & Drop
    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            console.log(`Sending ${file.name}...`, peers);
            sendFile(file, peers);
            
            // Add to UI list
            setTransfers(prev => [...prev, { name: file.name, type: 'upload' }]);
        });
    }, [peers]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div className="p-8 max-w-2xl mx-auto border">
            {/* DROP AREA */}
            <div 
                {...getRootProps()} 
                className={`border-4 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
            >
                <input {...getInputProps()} />
                <p className="text-xl font-bold text-gray-600">
                    {isDragActive ? "Drop it like it's hot!" : "Drag files here to send"}
                </p>
                <p className="text-sm text-gray-400 mt-2">P2P Encrypted • No Size Limit</p>
            </div>

            {/* TRANSFER LIST */}
            <div className="mt-8 space-y-4">
                {transfers.map((t, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded shadow">
                        <span>{t.name}</span>
                        <span className="text-blue-500 font-mono">Sending...</span>
                    </div>
                ))}
            </div>
        </div>
    );
}