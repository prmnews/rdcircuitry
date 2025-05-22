# SSH Key Setup for DigitalOcean

This guide provides step-by-step instructions for setting up SSH keys to securely connect to your DigitalOcean droplet without using passwords.

## Generating SSH Keys

### On Windows (Git Bash, WSL, or Windows Terminal)

1. **Generate a new SSH key pair**:
   ```bash
   ssh-keygen -t rsa -b 4096
   ```

2. **Follow the prompts**:
   - When asked for the file location, press Enter to use the default location (`~/.ssh/id_rsa`)
   - Enter a passphrase if desired (recommended for security) or press Enter for no passphrase
   - The command creates two files: `id_rsa` (private key) and `id_rsa.pub` (public key)

3. **Verify the key was created**:
   ```bash
   ls -la ~/.ssh
   ```
   You should see `id_rsa` and `id_rsa.pub` files.

## Adding SSH Key to DigitalOcean Droplet

### Method 1: Using ssh-copy-id (Recommended)

```bash
ssh-copy-id root@your-droplet-ip
```
You'll be prompted for the root password once. After this, future connections won't require a password.

### Method 2: Manual Copy (If ssh-copy-id doesn't work)

1. **Display your public key**:
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```

2. **Copy the entire output** (starts with `ssh-rsa` and ends with a comment like your username@hostname)

3. **Connect to your droplet** (you'll need the password this time):
   ```bash
   ssh root@your-droplet-ip
   ```

4. **Create the SSH directory and set permissions**:
   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ```

5. **Create or append to the authorized_keys file**:
   ```bash
   nano ~/.ssh/authorized_keys
   ```
   
6. **Paste your public key** on a new line in this file

7. **Save and exit**:
   - Press `Ctrl + O` then Enter to save
   - Press `Ctrl + X` to exit nano

8. **Set proper permissions**:
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   ```

## Using SSH Keys for File Transfer

Once SSH keys are set up, you can securely transfer files without password prompts:

```bash
# Copy a local file to the droplet
scp /path/to/local/file root@137.184.14.201:/path/on/server

# Example: Copy a certificate file
scp ./backend/global-bundle.pem root@137.184.14.201:/opt/rdcircuitry/backend/

# Copy a directory (recursively)
scp -r /path/to/local/directory root@your-droplet-ip:/path/on/server

# Copy a file from droplet to local machine
scp root@137.184.14.201:/path/on/server/file.txt /local/destination
```

## Additional Security Enhancements

1. **Disable password authentication** (after confirming SSH key works):
   ```bash
   # On the droplet, edit SSH config
   nano /etc/ssh/sshd_config
   ```
   
   Find and change these lines:
   ```
   PasswordAuthentication no
   ChallengeResponseAuthentication no
   ```
   
   Restart SSH service:
   ```bash
   systemctl restart sshd
   ```

2. **Change default SSH port** (optional, advanced security):
   ```bash
   # On the droplet, edit SSH config
   nano /etc/ssh/sshd_config
   ```
   
   Find the line with `#Port 22` and change to a custom port:
   ```
   Port 2222  # Choose any port between 1024 and 65535
   ```
   
   Restart SSH service:
   ```bash
   systemctl restart sshd
   ```
   
   Update firewall:
   ```bash
   ufw allow 2222/tcp
   ufw deny 22/tcp  # Only after confirming you can connect on new port
   ```
   
   Connect using the new port:
   ```bash
   ssh -p 2222 root@your-droplet-ip
   ```

## Troubleshooting

### Permission Denied Errors
```bash
# Check ownership and permissions
ls -la ~/.ssh

# Correct permissions if needed
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/authorized_keys
```

### Connection Issues
```bash
# Verbose connection for debugging
ssh -v root@your-droplet-ip

# Super verbose connection
ssh -vvv root@your-droplet-ip
```

### Key Format Issues
If you're getting key format errors, ensure the key is in the right format:
```bash
# Convert key if needed
ssh-keygen -p -f ~/.ssh/id_rsa -m PEM
``` 