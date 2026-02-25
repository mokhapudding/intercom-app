"use client";

import { useState } from "react";
import { Room, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from "livekit-client";

export default function Home() {
  const [roomName, setRoomName] = useState("test-room");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [roomInstance, setRoomInstance] = useState<Room | null>(null);

  const connectToRoom = async () => {
    if (!username) {
      alert("名前を入力してや");
      return;
    }

    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: roomName,
        username: username,
      }),
    });

    const data = await res.json();

    const room = new Room();

    // 🔊 相手の音声を受信したら再生
    room.on(
      "trackSubscribed",
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === "audio") {
          const audioElement = track.attach();
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
        }
      }
    );

    await room.connect(
      "wss://intercom-bf7qeml2.livekit.cloud",
      data.token
    );

    // 🎤 マイク有効化
    await room.localParticipant.enableMicrophone();

    setRoomInstance(room);
    setConnected(true);
  };

  const disconnect = async () => {
    if (roomInstance) {
      await roomInstance.disconnect();
      setConnected(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>インカム</h1>

      {!connected && (
        <>
          <div>
            <input
              placeholder="ルーム名"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

          <div>
            <input
              placeholder="名前"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <button onClick={connectToRoom}>
            接続する
          </button>
        </>
      )}

      {connected && (
        <>
          <p>接続中...</p>
          <button onClick={disconnect}>
            切断する
          </button>
        </>
      )}
    </div>
  );
}