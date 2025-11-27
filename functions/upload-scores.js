const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const body = JSON.parse(event.body);
        const { year, semester, scoreType, file, fileName, fileType } = body;

        if (!year || !semester || !scoreType || !file || !fileName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const branch = process.env.GITHUB_BRANCH || 'main';
        const timestamp = Date.now();
        const ext = fileName.split('.').pop() || 'pdf';
        const filePath = `data/scores/${timestamp}.${ext}`;

        // Upload file to GitHub
        const binaryData = file.split(',')[1];
        await github.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: filePath,
            message: `Upload scores: ${fileName}`,
            content: binaryData,
            branch: branch,
        });

        // Determine score type (midterm, final, etc.)
        const typeMap = {
            'mid1': 'Giữa HK1',
            'final1': 'Cuối HK1',
            'mid2': 'Giữa HK2',
            'final2': 'Cuối HK2',
        };

        // Get or create metadata file
        let metadataContent = '[]';
        try {
            const metadataFile = await github.repos.getContent({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/scores.json',
                ref: branch,
            });
            metadataContent = Buffer.from(metadataFile.data.content, 'base64').toString('utf-8');
        } catch (err) {
            // File doesn't exist yet, use empty array
        }

        let scores = [];
        try {
            scores = JSON.parse(metadataContent);
        } catch (e) {
            scores = [];
        }

        // Add new score entry
        const scoreEntry = {
            id: timestamp.toString(),
            year: year,
            semester: semester,
            scoreType: scoreType,
            scoreTypeText: typeMap[scoreType] || scoreType,
            fileName: fileName,
            url: `https://raw.githubusercontent.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/${branch}/${filePath}`,
            uploadedAt: new Date().toISOString(),
        };

        scores.push(scoreEntry);

        // Update metadata file
        const metadataFileContent = JSON.stringify(scores, null, 2);
        const metadataFileExists = metadataContent !== '[]';

        if (metadataFileExists) {
            // Get SHA for update
            const metadataFileInfo = await github.repos.getContent({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/scores.json',
                ref: branch,
            });
            await github.repos.createOrUpdateFileContents({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/scores.json',
                message: 'Update scores metadata',
                content: Buffer.from(metadataFileContent).toString('base64'),
                branch: branch,
                sha: metadataFileInfo.data.sha,
            });
        } else {
            await github.repos.createOrUpdateFileContents({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/scores.json',
                message: 'Create scores metadata',
                content: Buffer.from(metadataFileContent).toString('base64'),
                branch: branch,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, entry: scoreEntry }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        console.error('Error uploading score:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi upload bảng điểm: ' + err.message }),
        };
    }
};