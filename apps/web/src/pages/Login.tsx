import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react'; // Icons
import { socket } from '../config/socket-config';

export function Login() {
    const [form, setForm] = useState({ username: '', roomId: '', password: '' });
    const [error, setError] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const navigate = useNavigate();

    // Monitor Network Status
    useEffect(() => {
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
    }, []);

    const handleEnter = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.roomId || !form.password) {
            setError("⚠️ Please fill in all fields.");
            return;
        }

        // Emit Join Request
        socket.emit('join-room', form);

        // Listen for Success (One-time)
        socket.once('joined-success', ({ room_id }) => {
            navigate(`/room/${room_id}`, { state: { username: form.username } });
        });

        // Listen for Error
        socket.once('error-msg', (msg: string) => setError(msg));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl z-10">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        LocalCloud
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                        {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
                        <span className={isOnline ? "text-green-500" : "text-amber-500"}>
                            {isOnline ? "Network Active" : "Offline Mode"}
                        </span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium animate-pulse">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleEnter} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nickname</label>
                        <input 
                            className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                            placeholder="e.g. PartyAnimal"
                            value={form.username}
                            onChange={e => setForm({...form, username: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Room</label>
                            <input 
                                className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-700"
                                placeholder="VIP_Room"
                                value={form.roomId}
                                onChange={e => setForm({...form, roomId: e.target.value})}
                            />
                        </div>
                        <div className="w-[35%] space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pass</label>
                            <input 
                                type="password"
                                className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all placeholder:text-slate-700"
                                placeholder="1234"
                                value={form.password}
                                onChange={e => setForm({...form, password: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] mt-4"
                    >
                        ENTER ROOM 🚀
                    </button>
                </form>

                <p className="text-center text-slate-600 text-xs mt-6">
                    Connect to the same Wi-Fi / Hotspot to join.
                </p>
            </div>
        </div>
    );
}