const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1/accounts";

function getApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

export async function firebaseAuthRequest(path, body) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Firebase API key is missing.");

  const res = await fetch(`${IDENTITY_TOOLKIT}:${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || "Firebase Auth request failed.");
    err.code = json?.error?.message;
    throw err;
  }
  return json;
}

/**
 * Creates a Firebase Auth user, or returns UID if email already exists
 * and the given password is correct.
 */
export async function createOrGetFirebaseUser(email, password) {
  try {
    const created = await firebaseAuthRequest("signUp", {
      email,
      password,
      returnSecureToken: true,
    });
    return { uid: created.localId, created: true };
  } catch (err) {
    if (err.code !== "EMAIL_EXISTS") throw err;
    const existing = await firebaseAuthRequest("signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    return { uid: existing.localId, created: false };
  }
}

export function friendlyFirebaseAuthError(codeOrMessage) {
  const msg = String(codeOrMessage || "");
  if (msg.includes("EMAIL_EXISTS")) return "This email already has a Firebase login. Use the correct password, or pick another email.";
  if (msg.includes("INVALID_PASSWORD") || msg.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Email already exists in Firebase, but the password does not match.";
  }
  if (msg.includes("WEAK_PASSWORD")) return "Password must be at least 6 characters.";
  if (msg.includes("INVALID_EMAIL")) return "Invalid email address.";
  if (msg.includes("CONFIGURATION_NOT_FOUND")) {
    return "Enable Email/Password sign-in in Firebase Console → Authentication.";
  }
  return msg || "Firebase Auth error.";
}
