const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const REPO_OWNER = 'trungkien2710';
const REPO_NAME = '10A2-K26';
const METADATA_FILE = 'data/survey-scores.json';

exports.handler = async (event, context) => {
    try {
        // Get metadata from GitHub
        const response = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: METADATA_FILE
        });

        if (response.status === 200) {
            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            const metadata = JSON.parse(content);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata)
            };
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.status === 404) {
            // File doesn't exist yet
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([])
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error fetching metadata', error: error.message })
        };
    }
};