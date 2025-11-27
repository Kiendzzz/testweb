export async function handler(event) {
    try {
        const user = process.env.GITHUB_USER;
        const repo = process.env.GITHUB_REPO;
        const branch = process.env.GITHUB_BRANCH || "main";
        const token = process.env.GITHUB_TOKEN;

        // Validate required environment variables
        if (!user || !repo || !token) {
            throw new Error('Missing required environment variables: GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN');
        }
        const jsonPath = "data/memories.json";

        const url = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
        const res = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to fetch memories.json");
        }

        const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        console.log('Fetched content:', content);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ 
                data: content, 
                total: content.length
            })
        };
    } catch (err) {
        console.error('Fetch error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || "Server error" })
        };
    }
}