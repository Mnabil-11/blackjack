const API_URL = import.meta.env.VITE_API_URL;

export async function fetchScores() {
  const res = await fetch(`${API_URL}/api/scores`);
  if (!res.ok) throw new Error('Failed to fetch scores');
  return res.json();
}

export async function submitScore(username, score, password) {
  const res = await fetch(`${API_URL}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score, password }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Failed to submit score' }));
    throw new Error(error);
  }
  return res.json();
}
