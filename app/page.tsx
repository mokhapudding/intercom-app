"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";

export default function Home() {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  // 🔗 接続処理
  const connectToRoom = async () => {
    if (!username) return alert("名前入れてや");

    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "test-room", username }),
    });

    const data = await res.json();

    const newRoom = new Room();
    roomRef.current = newRoom;

    await newRoom.connect(
      "wss://intercom-bf7qeml2.livekit.cloud",
      data.token
    );

    // 🎤 マイク初期化（エコー対策全部ON）
    await newRoom.localParticipant.setMicrophoneEnabled(false, {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });

    // 👂 参加者管理
    const updateParticipants = () => {
      const names = Array.from(newRoom.participants.values()).map(
        (p) => p.identity
      );
      setParticipants([username, ...names]);
    };

    updateParticipants();

    newRoom.on(RoomEvent.ParticipantConnected, updateParticipants);
    newRoom.on(RoomEvent.ParticipantDisconnected, updateParticipants);

    // 🔊 音声再生（自分は除外）
    newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (participant.identity === username) return;

      if (track.kind === "audio") {
        const audioElement = track.attach();
        audioElement.volume = 0.3; // 🔥 音量下げてハウリング軽減
        document.body.appendChild(audioElement);
      }
    });

    // 📡 DataChannel受信
    newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
      const message = new TextDecoder().decode(payload);

      if (message === "TALKING") {
        setLockedBy(participant.identity);
        setSpeakingUser(participant.identity);
      }

      if (message === "STOP") {
        setLockedBy(null);
        setSpeakingUser(null);
      }
    });

    setRoom(newRoom);
    setConnected(true);
  };

  // 🎤 PTT押した
  const startTalking = async () => {
    if (!roomRef.current) return;
    if (lockedBy && lockedBy !== username) return;

    await roomRef.current.localParticipant.setMicrophoneEnabled(true);

    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode("TALKING"),
      { reliable: true }
    );

    setLockedBy(username);
    setSpeakingUser(username);
  };

  // 🎤 PTT離した
  const stopTalking = async () => {
    if (!roomRef.current) return;

    await roomRef.current.localParticipant.setMicrophoneEnabled(false);

    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode("STOP"),
      { reliable: true }
    );

    setLockedBy(null);
    setSpeakingUser(null);
  };

  return (
    <div style={{ padding: 20 }}>
      {!connected ? (
        <>
          <h2>名前入力</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="名前"
          />
          <button onClick={connectToRoom}>接続</button>
        </>
      ) : (
        <>
          <h2>接続中: {username}</h2>

          {/* 🎤 PTTボタン */}
          <button
            onMouseDown={startTalking}
            onMouseUp={stopTalking}
            disabled={lockedBy && lockedBy !== username}
            style={{
              width: 200,
              height: 80,
              fontSize: 20,
              backgroundColor:
                speakingUser === username ? "green" : "gray",
              color: "white",
            }}
          >
            押して話す
          </button>

          <h3>参加者一覧</h3>
          <ul>
            {participants.map((name) => (
              <li
                key={name}
                style={{
                  color: speakingUser === name ? "green" : "black",
                  fontWeight:
                    speakingUser === name ? "bold" : "normal",
                }}
              >
                {name}
                {speakingUser === name && " 🎤"}
              </li>
            ))}
          </ul>

          {lockedBy && (
            <p>
              🔒 {lockedBy} が発話中
            </p>
          )}
        </>
      )}
    </div>
  );
}