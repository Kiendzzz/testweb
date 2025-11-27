export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        const body = JSON.parse(event.body);
        const { tkbClass, tkbNumber, file, fileName, fileType } = body;

        if (!tkbClass || !tkbNumber || !file || !fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        const user = process.env.GITHUB_USER;
        const repo = process.env.GITHUB_REPO;
        const branch = process.env.GITHUB_BRANCH || "main";
        const token = process.env.GITHUB_TOKEN;

        if (!user || !repo || !token) {
            throw new Error('Missing environment variables');
        }

        // Extract base64 from data URL if needed
        let base64Content = file;
        if (file.startsWith('data:')) {
            base64Content = file.split(',')[1];
        }

        // Create file path with timestamp
        const timestamp = Date.now();
        const ext = fileName.split('.').pop();
        const filePath = `data/tkb/${timestamp}.${ext}`;

        // Upload to GitHub
        const uploadUrl = `https://api.github.com/repos/${user}/${repo}/contents/${filePath}`;
        
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Upload TKB số ${tkbNumber} - Lớp ${tkbClass}`,
                content: base64Content
            })
        });

        if (!uploadRes.ok) {
            throw new Error('Failed to upload file to GitHub');
        }

        // Now update tkb.json metadata file
        const tkbJsonPath = "data/tkb.json";
        const tkbUrl = `https://api.github.com/repos/${user}/${repo}/contents/${tkbJsonPath}?ref=${branch}`;

        // Get current tkb.json
        let tkbData = [];
        let fileSha = null;

        try {
            const getRes = await fetch(tkbUrl, {
                headers: { Authorization: `token ${token}` }
            });

            if (getRes.ok) {
                const fileData = await getRes.json();
                fileSha = fileData.sha;
                tkbData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
            }
        } catch (e) {
            // File doesn't exist yet
            tkbData = [];
        }

        // Determine file type
        let fileTypeCategory = 'file';
        if (fileType.includes('word') || fileType.includes('document')) {
            fileTypeCategory = 'docx';
        } else if (fileType.includes('pdf')) {
            fileTypeCategory = 'pdf';
        } else if (fileType.includes('image')) {
            fileTypeCategory = 'image';
        }

        // Add new TKB entry
        const newEntry = {
            id: `tkb_${timestamp}`,
            class: tkbClass,
            tkbNumber: parseInt(tkbNumber),
            fileName: fileName,
            type: fileTypeCategory,
            url: `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`,
            uploadedAt: new Date().toISOString()
        };

        tkbData.push(newEntry);

        // Update tkb.json
        const updateRes = await fetch(tkbUrl, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update TKB metadata for TKB số ${tkbNumber} - Lớp ${tkbClass}`,
                content: Buffer.from(JSON.stringify(tkbData, null, 2)).toString('base64'),
                sha: fileSha || undefined
            })
        });

        if (!updateRes.ok) {
            throw new Error('Failed to update TKB metadata');
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ success: true, entry: newEntry })
        };

    } catch (err) {
        console.error('Upload error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || 'Upload failed' })
        };
    }
}