import { useEffect } from 'react';

const useVoiceChat = (socket, roomId) => {
  useEffect(() => {
    let mediaRecorder;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          socket.emit('audioChunk', { roomId, chunk: e.data });
        };
        mediaRecorder.start(100);
      });

    socket.on('opponentAudio', (chunk) => {
      const audio = new Audio(URL.createObjectURL(new Blob([chunk])));
      audio.play();
    });

    return () => {
      mediaRecorder?.stop();
    };
  }, [socket, roomId]);
};

export default useVoiceChat;