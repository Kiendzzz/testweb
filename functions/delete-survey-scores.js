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
            path: 'data/survey-scores.json',
            ref: branch,
        });

        const metadataContent = Buffer.from(metadataFile.data.content, 'base64').toString('utf-8');
        let surveyScores = JSON.parse(metadataContent);

        // Find and remove entry
        const entry = surveyScores.find(s => s.id === id);
        if (!entry) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Survey score entry not found' }) };
        }

        surveyScores = surveyScores.filter(s => s.id !== id);

        // Update metadata file
        const updatedContent = JSON.stringify(surveyScores, null, 2);
        await github.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: 'data/survey-scores.json',
            message: 'Delete survey score entry',
            content: Buffer.from(updatedContent).toString('base64'),
            branch: branch,
            sha: metadataFile.data.sha,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        console.error('Error deleting survey score:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi xóa bảng điểm khảo sát' }),
        };
    }
};