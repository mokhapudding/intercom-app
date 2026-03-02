"use client";

import { useState, useRef } from "react";
import { Room, LocalAudioTrack } from "livekit-client";

export default function Home() {
  const [roomName, setRoomName] = useState("test-room");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

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

    // 🔊 相手の音声を再生
    room.on("trackSubscribed", (track) => {
      if (track.kind === "audio") {
        const audioElement = track.attach();
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      }
    });

    await room.connect(
      "wss://intercom-bf7qeml2.livekit.cloud",
      data.token
    );

    // 🎤 マイク取得（最初はミュート状態）
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const track = stream.getAudioTracks()[0];
    track.enabled = false; // ← 初期は送らない

    const localTrack = new LocalAudioTrack(track);
    await room.localParticipant.publishTrack(localTrack);

    roomRef.current = room;
    audioTrackRef.current = localTrack;

    setConnected(true);
  };

  const disconnect = async () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      setConnected(false);
    }
  };

  // 🔴 押してる間だけ送信
  const startTalking = () => {
    if (audioTrackRef.current) {
      audioTrackRef.current.mediaStreamTrack.enabled = true;
    }
  };

  const stopTalking = () => {
    if (audioTrackRef.current) {
      audioTrackRef.current.mediaStreamTrack.enabled = false;
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>店舗インカム（PTT）</h1>

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

          <button
            style={{
              marginTop: 20,
              padding: "30px",
              fontSize: "20px",
              backgroundColor: "red",
              color: "white",
              borderRadius: "10px",
            }}
            onMouseDown={startTalking}
            onMouseUp={stopTalking}
            onTouchStart={startTalking}
            onTouchEnd={stopTalking}
          >
            押して話す
          </button>

          <div style={{ marginTop: 20 }}>
            <button onClick={disconnect}>
              切断する
            </button>
          </div>
        </>
      )}
    </div>
  );
}