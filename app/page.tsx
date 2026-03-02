"use client";

import { useState, useRef } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  const connectToRoom = async () => {
    if (!username) {
      alert("名前入れてや");
      return;
    }

    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "test-room", username }),
    });

    const data = await res.json();

    const room = new Room();
    roomRef.current = room;

    await room.connect(
      "wss://intercom-bf7qeml2.livekit.cloud",
      data.token
    );

    // 最初はマイクOFF
    await room.localParticipant.setMicrophoneEnabled(false);

    // 参加者更新
    const updateParticipants = () => {
      const remoteNames = Array.from(
        room.remoteParticipants.values()
      ).map((p) => p.identity);

      setParticipants([username, ...remoteNames]);
    };

    updateParticipants();

    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);

    // 音声再生（自分除外）
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (participant.identity === username) return;

      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.volume = 0.3;
        document.body.appendChild(el);
      }
    });

    // DataChannel受信
    room.on(RoomEvent.DataReceived, (payload, participant) => {
      if (!participant) return;

      const msg = new TextDecoder().decode(payload);

      if (msg === "TALKING") {
        setLockedBy(participant.identity);
        setSpeakingUser(participant.identity);
      }

      if (msg === "STOP") {
        setLockedBy(null);
        setSpeakingUser(null);
      }
    });

    setConnected(true);
  };

  const startTalking = async () => {
    const room = roomRef.current;
    if (!room) return;
    if (!!lockedBy && lockedBy !== username) return;

    await room.localParticipant.setMicrophoneEnabled(true);

    room.localParticipant.publishData(
      new TextEncoder().encode("TALKING"),
      { reliable: true }
    );

    setLockedBy(username);
    setSpeakingUser(username);
  };

  const stopTalking = async () => {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(false);

    room.localParticipant.publishData(
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
          <button
            onMouseDown={startTalking}
            onMouseUp={stopTalking}
            onTouchStart={(e) => {
              e.preventDefault();
              startTalking();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopTalking();
            }}
            disabled={!!lockedBy && lockedBy !== username}
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

          {lockedBy && <p>🔒 {lockedBy} が発話中</p>}
        </>
      )}
    </div>
  );
}
