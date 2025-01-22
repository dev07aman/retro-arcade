"use client"
import { useState } from 'react';
import { FaGamepad, FaMicrophone, FaTrophy, FaPlus, FaSignInAlt } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import TournamentBracket from '../components/TournamentBracket/TournamentBracket';
import Link from 'next/link';

// Dynamically import GameCanvas
const GameCanvas = dynamic(() => import('../components/GameCanvas/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-4xl mx-auto aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading game...</div>
    </div>
  )
});

export default function Home() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [gameMode, setGameMode] = useState(null); // 'create' or 'join'

  const games = [
    { id: 'pong', name: 'Pong' }
  ];

  // Generate a random 5-digit room ID
  const generateRoomId = () => {
    const roomId = Math.floor(10000 + Math.random() * 90000).toString();
    setRoomId(roomId);
    return roomId;
  };

  const handleCreateRoom = () => {
    if (selectedGame) {
      setGameMode('create');
      generateRoomId();
      setIsJoined(true);
    }
  };

  const handleJoinRoom = () => {
    if (selectedGame && roomId.length === 5) {
      setGameMode('join');
      setIsJoined(true);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pixel-font">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl mb-8 pixel-title animate-pulse">
          RETRO PONG
        </h1>
        <p className="text-xl mb-12 text-green-400 pixel-text">
          A Classic Reimagined for the Modern Web
        </p>
        
        {/* Game Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-16">
          <Link href="/create-game" 
                className="pixel-box bg-blue-600 hover:bg-blue-700 p-6 rounded transition-transform transform hover:scale-105">
            <h2 className="text-2xl mb-2">Create Game</h2>
            <p className="text-sm text-blue-200">Host a new game and invite friends</p>
          </Link>
          
          <Link href="/join-game"
                className="pixel-box bg-purple-600 hover:bg-purple-700 p-6 rounded transition-transform transform hover:scale-105">
            <h2 className="text-2xl mb-2">Join Game</h2>
            <p className="text-sm text-purple-200">Enter a room code to join</p>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="pixel-card p-4">
            <h3 className="text-xl mb-2 text-yellow-400">Real-time Multiplayer</h3>
            <p className="text-sm">Challenge your friends in fast-paced matches</p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-xl mb-2 text-yellow-400">Retro Graphics</h3>
            <p className="text-sm">Experience the classic arcade feel</p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-xl mb-2 text-yellow-400">Global Leaderboard</h3>
            <p className="text-sm">Compete for the top spot</p>
          </div>
        </div>

        {/* How to Play */}
        <div className="max-w-2xl mx-auto text-left pixel-card p-6">
          <h2 className="text-2xl mb-4 text-center text-yellow-400">How to Play</h2>
          <ul className="space-y-2 text-green-300">
            <li>⬆️ Use Up Arrow to move paddle up</li>
            <li>⬇️ Use Down Arrow to move paddle down</li>
            <li>🏆 First to 5 points wins!</li>
            <li>🤝 Share your room code with friends to play</li>
          </ul>
        </div>
      </div>
    </main>
  );
}