"use client";

import { useState } from "react";
import { Room } from "livekit-client";

export default function Home() {
  const [roomName, setRoomName] = useState("test-room");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);

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

    await room.connect(
      "wss://intercom-bf7qeml2.livekit.cloud",
      data.token
    );

    await room.localParticipant.enableCameraAndMicrophone();

    setConnected(true);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>インカムテスト</h1>

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

      {connected && <p>接続中...</p>}
    </div>
  );
}