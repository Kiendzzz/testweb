const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
    try {
        const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const branch = process.env.GITHUB_BRANCH || 'main';
        
        const file = await github.repos.getContent({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: 'data/scores.json',
            ref: branch,
        });

        const content = Buffer.from(file.data.content, 'base64').toString('utf-8');
        const scores = JSON.parse(content);
        return {
            statusCode: 200,
            body: JSON.stringify(scores),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        // If file doesn't exist or error, return empty array
        if (err.status === 404) {
            return {
                statusCode: 200,
                body: JSON.stringify([]),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        console.error('Error loading scores:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Không thể tải bảng điểm' }),
        };
    }
};