"use client";

import { useState } from "react";
import { Room } from "livekit-client";

export default function Home() {
  const [connected, setConnected] = useState(false);

  const connectToRoom = async () => {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: "test-room",
        username: "taro",
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
      <button onClick={connectToRoom}>
        接続する
      </button>

      {connected && <p>接続中...</p>}
    </div>
  );
}