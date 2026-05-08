# Install ossutil
wget https://gosspublic.alicdn.com/ossutil/1.7.14/ossutil64
chmod +x ossutil64
mv ossutil64 /usr/local/bin/ossutil

# Configure with the oss-deployer AccessKey
ossutil config \
  -e oss-cn-hangzhou.aliyuncs.com \
  -i $OSS_ACCESS_KEY_ID \
  -k $OSS_ACCESS_KEY_SECRET

# Upload a single file
ossutil cp ./dist/app.js oss://my-app-bucket/dist/app.js

# Upload entire dist folder (sync)
ossutil sync ./dist/ oss://my-app-bucket/dist/ \
  --delete        # removes files in OSS not present locally
  --update        # only upload changed files

# Delete a specific old file
ossutil rm oss://my-app-bucket/dist/old-build.js

# Delete all files under a prefix (cleanup old release)
ossutil rm oss://my-app-bucket/releases/v1.0.0/ -r -f

# List objects to verify
ossutil ls oss://my-app-bucket/dist/