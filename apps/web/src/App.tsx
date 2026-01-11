import { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { DropZone } from './components/DropZone';
import AllRoutes from './routes/AllRoutes';

function App() {
    // Hardcoded room for MVP. In Phase 2, generate this or use URL params.
    // const ROOM_ID = "OFFICE_DEMO_1";
    
    // // 1. Initialize the Mesh Network
    // const { peers } = useWebRTC(ROOM_ID);

    // // Extract just the peer instances for the DropZone component
    // const activePeers = peers.map(p => p.peer);

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            {/* <header className="p-6 border-b border-slate-700 flex justify-between items-center"> */}
                {/* <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    LocalCloud <span className="text-xs text-slate-500 border border-slate-700 rounded px-2 py-0.5">BETA</span>
                </h1> */}
                
                {/* Peer Counter */}
                {/* <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${activePeers.length > 0 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-slate-400">
                        {activePeers.length} Peer{activePeers.length !== 1 && 's'} Connected
                    </span>
                </div> */}
            {/* </header> */}

            {/* <main className="container mx-auto mt-12">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-light mb-2">DropZone</h2>
                    <p className="text-slate-500">Secure P2P File Transfer</p>
                </div>

                <DropZone peers={activePeers} />

                <div className="mt-20 p-4 border-t border-slate-800 text-center text-xs text-slate-600">
                    Room ID: <span className="font-mono text-slate-400">{ROOM_ID}</span>
                </div>
            </main> */}
            <div>
                <AllRoutes />
            </div>
        </div>
    );
}

export default App;