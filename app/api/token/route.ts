import { NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"

export async function POST(req: Request) {
  const { room, username } = await req.json()

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: username }
  )

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })

  const token = await at.toJwt()

  return NextResponse.json({ token })
}