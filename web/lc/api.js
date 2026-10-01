// Clean LeetCode API layer using official POST https://leetcode.com/graphql/ via backend proxy.
export class ApiError extends Error {
  // kind: 'not_found' | 'rate_limited' | 'failed'
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export async function getLeetCodeProfile(username) {
  const u = (username || '').trim().replace(/^@/, '');
  if (!u) throw new ApiError('not_found', 'Username required');

  try {
    const res = await fetch(`/api/leetcode-profile?username=${encodeURIComponent(u)}`);
    if (res.status === 404) throw new ApiError('not_found', `User "${u}" not found`);
    if (res.status === 429) throw new ApiError('rate_limited', 'Rate limit reached on LeetCode API');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError('failed', err.error || `Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('failed', err.message || 'Network error');
  }
}
