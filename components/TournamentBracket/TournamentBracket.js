const TournamentBracket = ({ matchups }) => {
  if (!matchups || matchups.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400">No tournament matches available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>
      <div className="grid gap-4">
        {matchups.map((round, roundIndex) => (
          <div key={roundIndex} className="flex justify-around">
            {round.map((match, matchIndex) => (
              <div
                key={`${roundIndex}-${matchIndex}`}
                className="bg-gray-800 p-4 rounded-lg"
              >
                <div className="space-y-2">
                  <div className={`p-2 rounded ${match.player1.isWinner ? 'bg-green-500/20 border border-green-500' : 'bg-gray-700'}`}>
                    {match.player1.name}
                  </div>
                  <div className="text-center text-sm text-gray-400">vs</div>
                  <div className={`p-2 rounded ${match.player2.isWinner ? 'bg-green-500/20 border border-green-500' : 'bg-gray-700'}`}>
                    {match.player2.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentBracket;