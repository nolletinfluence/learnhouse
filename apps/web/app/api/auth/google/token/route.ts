import { NextRequest, NextResponse } from 'next/server'
import { resolveGoogleOAuthConfig } from '../../../../../lib/google-oauth-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, redirect_uri } = body

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const config = resolveGoogleOAuthConfig(process.env, request.nextUrl.origin)
    const clientSecret = config.readClientSecret()

    if (!config.configured || !config.clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 503 }
      )
    }

    if (redirect_uri !== config.callbackUri) {
      return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
    }

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Google token exchange failed:', errorData)
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      id_token: tokenData.id_token,
    })
  } catch (error: any) {
    console.error('Google token exchange error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
