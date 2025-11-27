exports.handler = async function(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        const body = JSON.parse(event.body);
        const { id } = body;

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing file id' })
            };
        }

        const user = process.env.GITHUB_USER;
        const repo = process.env.GITHUB_REPO;
        const branch = process.env.GITHUB_BRANCH || "main";
        const token = process.env.GITHUB_TOKEN;

        if (!user || !repo || !token) {
            throw new Error('Missing environment variables');
        }

        const tkbJsonPath = "data/tkb.json";
        const tkbUrl = `https://api.github.com/repos/${user}/${repo}/contents/${tkbJsonPath}?ref=${branch}`;

        // Get current tkb.json
        const getRes = await fetch(tkbUrl, {
            headers: { Authorization: `token ${token}` }
        });

        if (!getRes.ok) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'TKB file not found' })
            };
        }

        const fileData = await getRes.json();
        const fileSha = fileData.sha;
        let tkbData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

        // Find and remove the entry
        const indexToRemove = tkbData.findIndex(item => item.id === id);
        if (indexToRemove === -1) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Entry not found' })
            };
        }

        // Get file path to delete from GitHub
        const fileToDelete = tkbData[indexToRemove];
        const filePathToDelete = fileToDelete.url.split('/').pop();
        const actualFilePath = `data/tkb/${filePathToDelete}`;

        // Remove from array
        tkbData.splice(indexToRemove, 1);

        // Update tkb.json
        const updateRes = await fetch(tkbUrl, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Delete TKB file: ${fileToDelete.weekName}`,
                content: Buffer.from(JSON.stringify(tkbData, null, 2)).toString('base64'),
                sha: fileSha
            })
        });

        if (!updateRes.ok) {
            throw new Error('Failed to update TKB metadata');
        }

        // Try to delete the actual file from GitHub (optional - might fail if no delete permission)
        try {
            const deleteFileUrl = `https://api.github.com/repos/${user}/${repo}/contents/${actualFilePath}`;
            const getFileRes = await fetch(deleteFileUrl, {
                headers: { Authorization: `token ${token}` }
            });
            
            if (getFileRes.ok) {
                const deleteFileData = await getFileRes.json();
                await fetch(deleteFileUrl, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Delete TKB file`,
                        sha: deleteFileData.sha
                    })
                });
            }
        } catch (e) {
            console.log('Could not delete file from GitHub:', e.message);
            // Continue anyway - metadata was updated
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ success: true })
        };

    } catch (err) {
        console.error('Delete error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || 'Delete failed' })
        };
    }
};