# Deploying TrustWave Song Importer to Digital Ocean

## Prerequisites

- Digital Ocean account
- Basic terminal/SSH knowledge
- Script tested locally (you've already done this)

## Step 1: Create Droplet

1. Go to https://cloud.digitalocean.com
2. Create Droplet:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($6/month is sufficient)
   - **CPU:** Regular (1 GB RAM / 1 vCPU)
   - **Datacenter:** Choose closest to you
   - **Authentication:** SSH key (recommended) or password
3. Wait for droplet to spin up (~60 seconds)
4. Note the IP address

## Step 2: SSH Into Droplet

```bash
ssh root@<your-droplet-ip>
```

## Step 3: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install git
apt install -y git

# Install tmux (for background sessions)
apt install -y tmux
```

## Step 4: Clone Repository

```bash
cd /root
git clone https://github.com/aburra16/trustwave2.git
cd trustwave2/scripts
```

## Step 5: Install Script Dependencies

```bash
npm install
```

## Step 6: Configure Script

The script already has the correct nsec and configuration. Just verify:

```bash
nano import-songs-background.js
# Check NSEC is set correctly
# Press Ctrl+X to exit without changes
```

## Step 7: Run in Tmux (Background Session)

```bash
# Start a tmux session
tmux new -s trustwave-import

# Run the script
node import-songs-background.js

# The script is now running!
# Detach from tmux: Press Ctrl+B, then D
# You can close your terminal - script keeps running
```

## Step 8: Monitor Progress

**Reconnect anytime:**
```bash
ssh root@<your-droplet-ip>
tmux attach -t trustwave-import
```

**Check progress without attaching:**
```bash
tail -f /root/trustwave2/scripts/songs-import-checkpoint.json
```

**Check how many songs imported:**
```bash
cd /root/trustwave2/scripts
cat songs-import-checkpoint.json | grep processedMusicians | wc -l
```

## Step 9: Resume if Interrupted

If the script crashes or you stop it:

```bash
ssh root@<your-droplet-ip>
cd /root/trustwave2/scripts
tmux new -s trustwave-import
node import-songs-background.js --resume
# Ctrl+B, D to detach
```

## Alternative: Docker (Optional)

If you prefer Docker:

```bash
# Build image
cd /root/trustwave2/scripts
docker build -t trustwave-importer .

# Run container
docker run -d \
  --name trustwave-import \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  trustwave-importer

# View logs
docker logs -f trustwave-import

# Check progress
docker exec trustwave-import cat /app/data/songs-import-checkpoint.json
```

## Estimated Runtime

- **10,000 musicians** (relay limit): ~6-8 hours
- **All 248k musicians** (with pagination): ~3-6 days
- **Rate:** 1 API call/second + publish time

## Cost

- **Digital Ocean Droplet:** $6/month ($0.009/hour)
- **For 3-day import:** ~$2 total
- **For 6-day import:** ~$4 total

Much cheaper than keeping your laptop running!

## Monitoring

**Check if still running:**
```bash
tmux ls  # Shows active sessions
ps aux | grep node  # Shows node processes
```

**Stop the script:**
```bash
tmux attach -t trustwave-import
# Press Ctrl+C
# Or: kill the process
```

## After Completion

1. Check the logs for total songs imported
2. Refresh TrustWave app - songs should appear
3. **Destroy the droplet** (stop paying) or keep for future imports

## Troubleshooting

**Script not found:**
```bash
cd /root/trustwave2/scripts
ls -la
# Verify import-songs-background.js exists
```

**Node not installed:**
```bash
node --version
# Should show v20.x.x
```

**Tmux session lost:**
```bash
tmux ls
# If no sessions, the script stopped
# Check checkpoint to see progress
cat songs-import-checkpoint.json
```

**Out of disk space:**
```bash
df -h
# Checkpoint file is tiny, shouldn't be an issue
```

**Want faster import:**
- Edit `API_DELAY_MS = 500` (2 calls/second instead of 1)
- Risk: Might get rate limited by Podcast Index

## Security Notes

- The nsec is hardcoded in the script (acceptable for a bot account)
- Droplet is disposable (destroy after import completes)
- Checkpoint file doesn't contain sensitive data
- All published events are public anyway (Nostr protocol)
