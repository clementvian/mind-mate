import React, { useState, useEffect } from "react";

const LEETCODE_GQL_QUERY = `
query getUserLeetCodeData($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      reputation
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
  }
}
`;

export default function LeetCodeLiveCard({ username = "clementvian" }) {
  const [data, setData] = useState({
    username: username,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    totalSolved: 0,
    contestRating: "N/A",
    contestRank: "N/A",
    contestsAttended: 0,
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      setLoading(true);
      setError(null);

      const cleanUser = (username || "").trim().replace(/^@/, "");

      try {
        let stats = null;

        // Try direct POST to https://leetcode.com/graphql/
        try {
          const res = await fetch("https://leetcode.com/graphql/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              query: LEETCODE_GQL_QUERY,
              variables: { username: cleanUser }
            })
          });
          if (res.ok) {
            const gql = await res.json();
            const matchedUser = gql.data?.matchedUser;
            if (matchedUser) {
              const acList = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
              const findCount = diff => {
                const item = acList.find(x => String(x.difficulty).toLowerCase() === diff.toLowerCase());
                return item ? Number(item.count) || 0 : 0;
              };
              const contest = gql.data?.userContestRanking || {};
              stats = {
                username: matchedUser.username || cleanUser,
                easySolved: findCount("easy"),
                mediumSolved: findCount("medium"),
                hardSolved: findCount("hard"),
                totalSolved: findCount("all"),
                contestRating: contest.rating ? Math.round(contest.rating) : "N/A",
                contestRank: contest.globalRanking ? contest.globalRanking.toLocaleString() : "N/A",
                contestsAttended: contest.attendedContestsCount ?? 0,
                isActive: true
              };
            }
          }
        } catch (clientCorsErr) {
          // Fall back to server proxy if browser enforces CORS
        }

        // Fall back to server endpoint (which executes POST https://leetcode.com/graphql/ on backend)
        if (!stats) {
          const res = await fetch(`/api/leetcode?username=${encodeURIComponent(cleanUser)}`);
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `LeetCode API error (HTTP ${res.status})`);
          }
          const prof = await res.json();
          const d = prof.details || {};
          stats = {
            username: prof.username || cleanUser,
            easySolved: d.easy ?? 0,
            mediumSolved: d.medium ?? 0,
            hardSolved: d.hard ?? 0,
            totalSolved: d.total ?? 0,
            contestRating: d.contestRating ?? (d.ranking ? d.ranking.toLocaleString() : "N/A"),
            contestRank: d.contestRank ? d.contestRank.toLocaleString() : (d.reputation ? d.reputation.toLocaleString() : "N/A"),
            contestsAttended: d.contestsAttended ?? prof.totalActiveDays ?? 0,
            isActive: prof.status === "ok"
          };
        }

        if (isMounted) {
          setData(stats);
        }
      } catch (err) {
        if (isMounted) {
          console.error("LeetCode Live fetch error:", err);
          setError(err.message || "Failed to fetch latest stats");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [username]);

  return (
    <div className="w-full max-w-[380px] bg-[#12111A] text-white p-5 rounded-[28px] border border-[#252136] shadow-2xl font-sans select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#FFA116] rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-orange-950/40">
            LC
          </div>
          <div>
            <h2 className="text-[17px] font-bold leading-tight tracking-tight text-gray-100">
              LeetCode Live
            </h2>
            <p className="text-xs text-gray-400 font-medium">@{data.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0D2E28] border border-[#13493E] text-[#00B8A3] text-xs font-semibold rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#00B8A3] animate-pulse"></span>
          Active Solver
        </div>
      </div>

      {/* Loading Overlay State */}
      {loading && (
        <div className="py-10 flex flex-col items-center justify-center text-xs text-gray-400 gap-2">
          <div className="w-6 h-6 border-2 border-[#FFA116] border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to LeetCode API...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Difficulty Grid: EASY, MEDIUM, HARD */}
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {/* EASY Box */}
            <div className="bg-[#122428] border border-[#1B3E43] rounded-2xl p-3 text-center transition-transform hover:scale-[1.02]">
              <span className="text-[11px] font-bold text-[#00B8A3] tracking-wider block mb-1">
                EASY
              </span>
              <span className="text-2xl font-extrabold text-[#00B8A3] block leading-none">
                {data.easySolved}
              </span>
              <span className="text-[10px] text-[#00B8A3]/70 font-medium mt-1.5 block">
                Solved
              </span>
            </div>

            {/* MEDIUM Box */}
            <div className="bg-[#292218] border border-[#443621] rounded-2xl p-3 text-center transition-transform hover:scale-[1.02]">
              <span className="text-[11px] font-bold text-[#FFA116] tracking-wider block mb-1">
                MEDIUM
              </span>
              <span className="text-2xl font-extrabold text-[#FFA116] block leading-none">
                {data.mediumSolved}
              </span>
              <span className="text-[10px] text-[#FFA116]/70 font-medium mt-1.5 block">
                Solved
              </span>
            </div>

            {/* HARD Box */}
            <div className="bg-[#281822] border border-[#432032] rounded-2xl p-3 text-center transition-transform hover:scale-[1.02]">
              <span className="text-[11px] font-bold text-[#EF4743] tracking-wider block mb-1">
                HARD
              </span>
              <span className="text-2xl font-extrabold text-[#EF4743] block leading-none">
                {data.hardSolved}
              </span>
              <span className="text-[10px] text-[#EF4743]/70 font-medium mt-1.5 block">
                Solved
              </span>
            </div>
          </div>

          {/* Contest Stats Purple Card */}
          <div className="bg-[#1C182B] border border-[#2B2442] rounded-2xl p-3.5 mb-3.5 grid grid-cols-3 text-center items-center">
            <div>
              <span className="text-[9px] font-bold text-gray-400 tracking-wider block leading-tight">
                CONTEST<br />RATING
              </span>
              <span className="text-base font-extrabold text-[#C084FC] mt-1 block">
                {data.contestRating}
              </span>
            </div>

            <div className="border-x border-[#2E2747] px-1">
              <span className="text-[9px] font-bold text-gray-400 tracking-wider block leading-tight">
                GLOBAL CONTEST<br />RANK
              </span>
              <span className="text-base font-extrabold text-[#C084FC] mt-1 block">
                {data.contestRank}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-gray-400 tracking-wider block leading-tight">
                ATTENDED
              </span>
              <span className="text-xl font-extrabold text-[#C084FC] block leading-none mt-0.5">
                {data.contestsAttended}
              </span>
              <span className="text-[10px] font-semibold text-[#C084FC] block mt-0.5">
                contests
              </span>
            </div>
          </div>

          {/* Footer Row */}
          <div className="flex justify-between items-center text-xs text-gray-400 px-1 pt-1 border-t border-[#1C1929]">
            <span className="font-medium text-gray-400">
              Total Solved:{" "}
              <strong className="text-white font-bold">{data.totalSolved}</strong>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              leetcode.com/graphql
            </span>
          </div>
        </>
      )}

      {error && !loading && (
        <p className="text-center text-xs text-red-400 mt-2 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
