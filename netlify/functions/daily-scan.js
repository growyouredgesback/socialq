const https = require('https');

exports.handler = async function(event, context) {
  const FOLDER_ID = process.env.DRIVE_INBOX_FOLDER_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
      const NTFY_TOPIC = process.env.NTFY_TOPIC;

        if (!FOLDER_ID || !API_KEY || !NTFY_TOPIC) {
            console.error('Missing environment variables');
                return { statusCode: 500, body: 'Missing env vars' };
                  }

                    try {
                        // Query Drive for media files in the inbox folder
                            const query = encodeURIComponent(
                                  `'${FOLDER_ID}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed=false`
                                      );
                                          const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${API_KEY}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=50`;

                                              const files = await new Promise((resolve, reject) => {
                                                    https.get(driveUrl, (res) => {
                                                            let data = '';
                                                                    res.on('data', chunk => data += chunk);
                                                                            res.on('end', () => {
                                                                                      try { resolve(JSON.parse(data)); }
                                                                                                catch(e) { reject(e); }
                                                                                                        });
                                                                                                              }).on('error', reject);
                                                                                                                  });
                                                                                                                  
                                                                                                                      const fileList = files.files || [];
                                                                                                                          console.log(`Found ${fileList.length} files in Drive inbox`);
                                                                                                                          
                                                                                                                              if (fileList.length > 0) {
                                                                                                                                    const names = fileList.slice(0, 3).map(f => f.name).join(', ');
                                                                                                                                          const more = fileList.length > 3 ? ` (+${fileList.length - 3} more)` : '';
                                                                                                                                                const message = `${fileList.length} new file${fileList.length > 1 ? 's' : ''} in Drive: ${names}${more}`;
                                                                                                                                                
                                                                                                                                                      // Send push notification via ntfy.sh
                                                                                                                                                            await new Promise((resolve, reject) => {
                                                                                                                                                                    const options = {
                                                                                                                                                                              hostname: 'ntfy.sh',
                                                                                                                                                                                        port: 443,
                                                                                                                                                                                                  path: `/${NTFY_TOPIC}`,
                                                                                                                                                                                                            method: 'POST',
                                                                                                                                                                                                                      headers: {
                                                                                                                                                                                                                                  'Content-Type': 'text/plain',
                                                                                                                                                                                                                                              'Title': 'SocialQ — New Drive Files',
                                                                                                                                                                                                                                                          'Priority': 'default',
                                                                                                                                                                                                                                                                      'Tags': 'inbox_tray'
                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                        };
                                                                                                                                                                                                                                                                                                const req = https.request(options, (res) => {
                                                                                                                                                                                                                                                                                                          res.on('data', () => {});
                                                                                                                                                                                                                                                                                                                    res.on('end', resolve);
                                                                                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                                                                                                    req.on('error', reject);
                                                                                                                                                                                                                                                                                                                                            req.write(message);
                                                                                                                                                                                                                                                                                                                                                    req.end();
                                                                                                                                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                console.log(`Notification sent: ${message}`);
                                                                                                                                                                                                                                                                                                                                                                      return { statusCode: 200, body: `Notified: ${message}` };
                                                                                                                                                                                                                                                                                                                                                                          } else {
                                                                                                                                                                                                                                                                                                                                                                                console.log('No new files found in Drive inbox');
                                                                                                                                                                                                                                                                                                                                                                                      return { statusCode: 200, body: 'No new files' };
                                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                                            } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                console.error('Error:', err.message);
                                                                                                                                                                                                                                                                                                                                                                                                    return { statusCode: 500, body: `Error: ${err.message}` };
                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                      };
