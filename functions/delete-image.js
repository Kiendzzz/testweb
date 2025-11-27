export async function handler(event) {
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { path, password } = JSON.parse(event.body || '{}');
    const CLASS_PASSWORD = process.env.CLASS_PASSWORD;
    if (!CLASS_PASSWORD) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
    }
    if (password !== CLASS_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Sai mật khẩu lớp!' }) };
    }

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;

    // Validate required environment variables
    if (!user || !repo || !token) {
      throw new Error('Missing required environment variables: GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN');
    }

    // Get current memories.json
    const jsonPath = "data/memories.json";
    const jsonUrl = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
    const jsonRes = await fetch(jsonUrl, {
      headers: { Authorization: `token ${token}` }
    });

    if (!jsonRes.ok) {
      throw new Error((await jsonRes.json()).message || "memories.json not found");
    }

    const jsonData = await jsonRes.json();
    let memories = JSON.parse(Buffer.from(jsonData.content, 'base64').toString('utf8'));

    // Remove the entry
    memories = memories.filter(m => m.path !== path);

    // Put updated json with UTF-8
    const newContent = Buffer.from(JSON.stringify(memories, null, 2), 'utf8').toString('base64');
    const putJsonRes = await fetch(jsonUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        message: `Remove memory at path: ${path}`,
        content: newContent,
        sha: jsonData.sha,
        branch,
      }),
    });

    if (!putJsonRes.ok) {
      throw new Error((await putJsonRes.json()).message || "Update memories.json failed");
    }

    // Delete the image
    const imageUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`;
    const imageRes = await fetch(imageUrl, {
      headers: { Authorization: `token ${token}` }
    });
    const imageData = await imageRes.json();
    if (!imageRes.ok) {
      throw new Error(imageData.message || "Image not found");
    }

    const deleteRes = await fetch(imageUrl, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        message: `Xóa ảnh ${path}`,
        sha: imageData.sha,
        branch
      })
    });

    const deleteData = await deleteRes.json();
    if (!deleteRes.ok) {
      throw new Error(deleteData.message || "Delete image failed");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, path })
    };
  } catch (err) {
    console.error('Delete error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}