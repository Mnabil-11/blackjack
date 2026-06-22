const API_URL = "https://blackjack-server-nine.vercel.app";

async function handleResponse(res) {
  if (!res.ok) {
    const { error } = await res
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error);
  }
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

export async function register(username, password) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

export async function updateScore(username, password, score) {
  const res = await fetch(`${API_URL}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, score }),
  });
  return handleResponse(res);
}
