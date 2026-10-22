// Google OAuth (authorization-code flow) helpers shared by Login and Signup.
//
// Google's redirect back to us carries whatever `state` we sent, unchanged.
// Without checking it, an attacker can send a victim a link straight to the
// callback page carrying the ATTACKER's own authorization code — the victim's
// browser would exchange it and end up signed into the attacker's account
// (classic OAuth login-CSRF). Storing a random state in sessionStorage at the
// start of *this browser's* flow, and requiring it to match on return, means
// a callback that wasn't initiated by this browser is rejected.
const STATE_KEY = "google_oauth_state";

const GOOGLE_CLIENT_ID =
  "8993578499-0dffgdlfiso4qt35m4gvj6g0bgofpm3g.apps.googleusercontent.com";
// Derive the redirect URI from wherever the app is actually served (e.g.
// http://localhost:4000). Hardcoding a port broke sign-in whenever the dev
// server ran on a different port than the one baked in here. This exact origin
// + path must also be listed under the OAuth client's "Authorized redirect
// URIs" in the Google Cloud console.
const REDIRECT_URI = `${window.location.origin}/auth-callback.html`;

export function startGoogleSignIn(): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Single-use: clears the stored state whether or not it matches, so a replayed
// callback URL can't be exchanged twice.
export function consumeGoogleOAuthState(receivedState: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return !!expected && !!receivedState && receivedState === expected;
}
