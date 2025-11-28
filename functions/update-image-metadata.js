exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  try {
    const { path, title, date, password } = JSON.parse(event.body || '{}');
    const CLASS_PASSWORD = process.env.CLASS_PASSWORD;
    if (!CLASS_PASSWORD) {
      throw new Error('Server misconfigured');
    }
    if (password !== CLASS_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Sai mật khẩu lớp!' }) };
    }

    if (!path || !title || !date) {
      throw new Error('Missing required fields: path, title, date');
    }

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;
    if (!user || !repo || !token) {
      throw new Error('Missing required environment variables: GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN');
    }

    // Load current memories
    const jsonPath = 'data/memories.json';
    const jsonUrl = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
    const jsonRes = await fetch(jsonUrl, { headers: { Authorization: `token ${token}` } });
    if (!jsonRes.ok) {
      throw new Error((await jsonRes.json()).message || 'memories.json not found');
    }
    const jsonData = await jsonRes.json();
    const memories = JSON.parse(atob(jsonData.content));

    // Update matching entry
    let updated = false;
    const updatedMemories = memories.map(m => {
      if (m.path === path) {
        updated = true;
        return { ...m, title, date };
      }
      return m;
    });
    if (!updated) {
      throw new Error('Memory not found');
    }

    const newContent = Buffer.from(JSON.stringify(updatedMemories, null, 2), 'utf8').toString('base64');
    const putRes = await fetch(jsonUrl, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ message: `Update metadata: ${path}`, content: newContent, sha: jsonData.sha, branch })
    });
    if (!putRes.ok) {
      throw new Error((await putRes.json()).message || 'Update memories.json failed');
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};