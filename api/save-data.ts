import type { VercelRequest, VercelResponse } from "@vercel/node";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "hbf104536";
const GITHUB_REPO = process.env.GITHUB_REPO || "charlottesweb";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const DATA_PATH = "src/data/sectors.json";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!adminPassword || !githubToken) {
    res.status(500).json({
      error:
        "The admin save endpoint isn't configured yet. Set ADMIN_PASSWORD and GITHUB_TOKEN in your Vercel project's environment variables.",
    });
    return;
  }

  const { password, sectors } = (req.body ?? {}) as { password?: string; sectors?: unknown };

  if (password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  if (!sectors || !Array.isArray(sectors)) {
    res.status(400).json({ error: "Missing or invalid sectors data." });
    return;
  }

  const content = JSON.stringify({ sectors }, null, 2) + "\n";
  const githubHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}?ref=${GITHUB_BRANCH}`;
    const getResp = await fetch(getUrl, { headers: githubHeaders });
    if (!getResp.ok) {
      res.status(502).json({ error: `Could not read the current data file from GitHub (${getResp.status}).` });
      return;
    }
    const currentFile = (await getResp.json()) as { sha: string };

    const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`;
    const putResp = await fetch(putUrl, {
      method: "PUT",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update sectors data via admin panel",
        content: Buffer.from(content, "utf-8").toString("base64"),
        sha: currentFile.sha,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!putResp.ok) {
      const text = await putResp.text();
      res.status(502).json({ error: `GitHub commit failed (${putResp.status}): ${text.slice(0, 300)}` });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error." });
  }
}
