const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const body = JSON.parse(event.body);
        const { id } = body;

        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
        }

        const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const branch = process.env.GITHUB_BRANCH || 'main';

        // Get metadata file
        const metadataFile = await github.repos.getContent({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: 'data/scores.json',
            ref: branch,
        });

        const metadataContent = Buffer.from(metadataFile.data.content, 'base64').toString('utf-8');
        let scores = JSON.parse(metadataContent);

        // Find and remove entry
        const entry = scores.find(s => s.id === id);
        if (!entry) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Score entry not found' }) };
        }

        scores = scores.filter(s => s.id !== id);

        // Update metadata file
        const updatedContent = JSON.stringify(scores, null, 2);
        await github.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: 'data/scores.json',
            message: 'Delete score entry',
            content: Buffer.from(updatedContent).toString('base64'),
            branch: branch,
            sha: metadataFile.data.sha,
        });

        // Try to delete file from GitHub (best effort)
        try {
            const filePath = entry.url.split('/').slice(-1)[0]; // Extract filename
            // Note: We'd need the SHA of the file to delete it, which requires another API call
            // For now, just delete the metadata entry
        } catch (e) {
            console.error('Note: Could not delete score file from repo:', e.message);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        console.error('Error deleting score:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi xóa bảng điểm' }),
        };
    }
};