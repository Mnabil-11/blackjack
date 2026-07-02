const API_URL = import.meta.env.VITE_API_URL || "https://blackjack-server-nine.vercel.app";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function handleResponse(res) {
  if (!res.ok) {
    const { error } = await res
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error);
  }
  return res.json();
}

function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then(handleResponse);
}

export function register(username, password) {
  return request("/api/auth", { method: "POST", body: { action: "register", username, password }, auth: false });
}

export function login(username, password) {
  return request("/api/auth", { method: "POST", body: { action: "login", username, password }, auth: false });
}

export function heartbeat() {
  return request("/api/auth", { method: "POST", body: { action: "heartbeat" } });
}

export function fetchMe() {
  return request("/api/auth?action=me");
}

export function searchUsers(q) {
  return request(`/api/users?action=search&q=${encodeURIComponent(q)}`);
}

export function fetchOnlineUsers() {
  return request("/api/users?action=online");
}

export function sendFriendRequest(username) {
  return request("/api/friends", { method: "POST", body: { action: "request", username } });
}

export function respondFriendRequest(requestId, accept) {
  return request("/api/friends", { method: "POST", body: { action: "respond", requestId, accept } });
}

export function removeFriend(friendId) {
  return request("/api/friends", { method: "POST", body: { action: "remove", friendId } });
}

export function fetchFriends() {
  return request("/api/friends?action=list");
}

export function fetchPendingRequests() {
  return request("/api/friends?action=pending");
}

export function fetchLeaderboard(sortBy = "wins", mode) {
  const params = new URLSearchParams({ action: "leaderboard", sortBy });
  if (mode) params.set("mode", mode);
  return request(`/api/stats?${params.toString()}`, { auth: false });
}

export function fetchMyStats() {
  return request("/api/stats?action=me");
}

export function recordMatchResult(outcome, isBlackjack = false, cardCount = 2) {
  return request("/api/stats", { method: "POST", body: { action: "record", outcome, isBlackjack, cardCount } });
}

export function joinMatchmaking() {
  return request("/api/matchmaking", { method: "POST", body: { action: "join" } });
}

export function leaveMatchmaking() {
  return request("/api/matchmaking", { method: "POST", body: { action: "leave" } });
}

export function matchmakingStatus() {
  return request("/api/matchmaking?action=status");
}

export function inviteFriend(username) {
  return request("/api/matches", { method: "POST", body: { action: "invite", username } });
}

export function respondToInvite(matchId, accept) {
  return request("/api/matches", { method: "POST", body: { action: "respondInvite", matchId, accept } });
}

export function fetchIncomingInvites() {
  return request("/api/matches?action=incoming");
}

export function fetchMatchState(matchId) {
  return request(`/api/matches?action=state&matchId=${encodeURIComponent(matchId)}`);
}

export function sendMatchMove(matchId, move) {
  return request("/api/matches", { method: "POST", body: { action: "move", matchId, move } });
}

export function fetchAchievements() {
  return request("/api/achievements?action=list");
}

export function fetchRankedMe() {
  return request("/api/ranked?action=me");
}

export function fetchRankedLeaderboard() {
  return request("/api/ranked?action=leaderboard", { auth: false });
}
