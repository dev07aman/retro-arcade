'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const GameCanvas = dynamic(() => import('../../components/GameCanvas/GameCanvas'), { ssr: false });

export default function CreateGame() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pixel-font p-8">
      <Link href="/" className="inline-block mb-8 pixel-box bg-gray-800 px-4 py-2 hover:bg-gray-700">
        ← Back to Home
      </Link>
      
      <div className="max-w-4xl mx-auto">
        <GameCanvas isHost={true} />
      </div>
    </div>
  );
} 