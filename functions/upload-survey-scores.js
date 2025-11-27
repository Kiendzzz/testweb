const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const body = JSON.parse(event.body);
        const { year, semester, file, fileName, fileType } = body;

        if (!year || !semester || !file || !fileName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const branch = process.env.GITHUB_BRANCH || 'main';
        const timestamp = Date.now();
        const ext = fileName.split('.').pop() || 'pdf';
        const filePath = `data/survey-scores/${timestamp}.${ext}`;

        // Upload file to GitHub
        const binaryData = file.split(',')[1];
        await github.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_USER,
            repo: process.env.GITHUB_REPO,
            path: filePath,
            message: `Upload survey scores: ${fileName}`,
            content: binaryData,
            branch: branch,
        });

        // Determine semester text
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
                path: 'data/survey-scores.json',
                ref: branch,
            });
            metadataContent = Buffer.from(metadataFile.data.content, 'base64').toString('utf-8');
        } catch (err) {
            // File doesn't exist yet, use empty array
        }

        let surveyScores = [];
        try {
            surveyScores = JSON.parse(metadataContent);
        } catch (e) {
            surveyScores = [];
        }

        // Add new survey score entry
        const surveyScoreEntry = {
            id: timestamp.toString(),
            year: year,
            semester: semester,
            semesterText: typeMap[semester] || semester,
            fileName: fileName,
            url: `https://raw.githubusercontent.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/${branch}/${filePath}`,
            uploadedAt: new Date().toISOString(),
        };

        surveyScores.push(surveyScoreEntry);

        // Update metadata file
        const metadataFileContent = JSON.stringify(surveyScores, null, 2);
        const metadataFileExists = metadataContent !== '[]';

        if (metadataFileExists) {
            // Get SHA for update
            const metadataFileInfo = await github.repos.getContent({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/survey-scores.json',
                ref: branch,
            });
            await github.repos.createOrUpdateFileContents({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/survey-scores.json',
                message: 'Update survey scores metadata',
                content: Buffer.from(metadataFileContent).toString('base64'),
                branch: branch,
                sha: metadataFileInfo.data.sha,
            });
        } else {
            await github.repos.createOrUpdateFileContents({
                owner: process.env.GITHUB_USER,
                repo: process.env.GITHUB_REPO,
                path: 'data/survey-scores.json',
                message: 'Create survey scores metadata',
                content: Buffer.from(metadataFileContent).toString('base64'),
                branch: branch,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, entry: surveyScoreEntry }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        console.error('Error uploading survey score:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi upload bảng điểm khảo sát: ' + err.message }),
        };
    }
};
