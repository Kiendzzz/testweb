export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { title, date, filename, contentBase64 } = JSON.parse(event.body);

    // Validate input data
    if (!title || !date || !filename || !contentBase64) {
      throw new Error('Missing required fields: title, date, filename, contentBase64');
    }

    // Rough size check (base64 ~1.33x binary)
    const approxSize = Buffer.from(contentBase64, 'base64').length;
    if (approxSize > 5 * 1024 * 1024) {
      throw new Error('File too large: Max 5MB');
    }

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;
    const CLASS_PASSWORD = process.env.CLASS_PASSWORD;

    // Validate required environment variables
    if (!user || !repo || !token) {
      throw new Error('Missing required environment variables: GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN');
    }

    const timestamp = Date.now();
    const path = `img/memories/${timestamp}_${filename}`;

    // Upload image
    const imageUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
    const imageRes = await fetch(imageUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        message: `Upload ảnh: ${title}`,
        content: contentBase64,
        branch,
      }),
    });

    const imageData = await imageRes.json();
    if (!imageRes.ok) {
      throw new Error(imageData.message || "Upload image failed");
    }

    const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;

    // Get current memories.json
    const jsonPath = "data/memories.json";
    const jsonUrl = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
    const jsonRes = await fetch(jsonUrl, {
      headers: { Authorization: `token ${token}` }
    });

    let memories = [];
    let jsonSha = null;
    if (jsonRes.ok) {
      const jsonData = await jsonRes.json();
      memories = JSON.parse(Buffer.from(jsonData.content, 'base64').toString('utf8'));
      jsonSha = jsonData.sha;
    }

    // Add new entry (unshift for newest first)
    memories.unshift({ title, date, url: rawUrl, path });

    // Put updated json with explicit UTF-8
    const newContent = Buffer.from(JSON.stringify(memories, null, 2), 'utf8').toString('base64');
    const putJsonRes = await fetch(jsonUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        message: `Add memory: ${title}`,
        content: newContent,
        sha: jsonSha,
        branch,
      }),
    });

    const putJsonData = await putJsonRes.json();
    if (!putJsonRes.ok) {
      throw new Error(putJsonData.message || "Update memories.json failed");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ url: rawUrl, title, date, path }),
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unexpected server error" })
    };
  }
}

exports.handler = async function(event, context) {
  const parsed = JSON.parse(event.body || '{}');
  const password = parsed.password;
  const CLASS_PASSWORD = process.env.CLASS_PASSWORD;
  if (!CLASS_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }
  if (password !== CLASS_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sai mật khẩu lớp!' }) };
  }
  return handler(event);
};