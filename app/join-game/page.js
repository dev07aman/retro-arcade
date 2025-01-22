'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const GameCanvas = dynamic(() => import('../../components/GameCanvas/GameCanvas'), { ssr: false });

export default function JoinGame() {
  const [roomId, setRoomId] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoin = () => {
    if (roomId.length === 5) {
      setHasJoined(true);
    }
  };

  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pixel-font p-8">
        <Link href="/" className="inline-block mb-8 pixel-box bg-gray-800 px-4 py-2 hover:bg-gray-700">
          ← Back to Home
        </Link>
        
        <div className="max-w-4xl mx-auto">
          <GameCanvas isHost={false} roomId={roomId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pixel-font p-8">
      <Link href="/" className="inline-block mb-8 pixel-box bg-gray-800 px-4 py-2 hover:bg-gray-700">
        ← Back to Home
      </Link>

      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl mb-8 pixel-title">Join Game</h1>
        
        <div className="pixel-card p-8">
          <label className="block mb-4 text-green-400">Enter Room ID</label>
          <input
            type="text"
            maxLength={5}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            className="w-full mb-6 px-4 py-3 bg-black border-2 border-gray-700 focus:border-blue-500 outline-none text-center text-2xl tracking-wider font-mono"
            placeholder="00000"
          />
          
          <button
            onClick={handleJoin}
            disabled={roomId.length !== 5}
            className="pixel-box bg-blue-600 hover:bg-blue-700 px-8 py-3 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
} 