exports.handler = async function(event) {
    try {
        const user = process.env.GITHUB_USER;
        const repo = process.env.GITHUB_REPO;
        const branch = process.env.GITHUB_BRANCH || "main";
        const token = process.env.GITHUB_TOKEN;

        if (!user || !repo || !token) {
            throw new Error('Missing required environment variables');
        }

        const jsonPath = "data/tkb.json";
        const url = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
        
        const res = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        
        if (res.status === 404) {
            // File doesn't exist yet, return empty array
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify([])
            };
        }

        if (!res.ok) {
            throw new Error("Failed to fetch TKB files");
        }

        const data = await res.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(content)
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || "Server error" })
        };
    }
};