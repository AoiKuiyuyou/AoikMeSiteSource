--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Git auto deploy latest commit

author: Aoik

create_time: 2019-08-24 20:00:00

tags:
    - git

post_id: 41

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Git auto deploy latest commit
Clone your repository to `/opt/repository`.

Put the following script to `/opt/repository`.

**auto_deploy_latest_commit.sh**:
```
#!/usr/bin/env bash

prog_dir="$(dirname "$0")"

last_commit_hash_file_path="${prog_dir}/last_commit_hash.txt"

touch "$last_commit_hash_file_path";

last_commit_hash="$(cat "${prog_dir}/last_commit_hash.txt")";

if [ "${#last_commit_hash}" != "40" ]; then
    last_commit_hash='';
fi

is_first_round='1'

while true;
do
    if [ "${is_first_round}" != '1' ]; then
        sleep 600;
    else
        is_first_round='';
    fi

    latest_commit_hash="$(git ls-remote origin -h refs/heads/master | cut -d$'\t' -f1)"

    if [ "${#latest_commit_hash}" != "40" ]; then
        printf 'Error: Failed getting lastest commit hash.\n';
        continue;
    fi

    if [ "$latest_commit_hash" == "$last_commit_hash" ]; then
        continue
    fi

    printf '# %s\n' "$(date +"%Y-%m-%d %H:%M:%S")";
    printf 'New commit: %s.\n' "$latest_commit_hash";

    last_commit_hash="$latest_commit_hash";

    printf "$last_commit_hash" > "$last_commit_hash_file_path";

    git fetch &&
    git checkout --force master &&
    git reset --hard remotes/origin/master &&
    rm -rf _DEPLOY_DIR_ &&
    cp -a _RELEASE_DIR_ _DEPLOY_DIR_
done;
```
Replace `_DEPLOY_DIR_` and `_RELEASE_DIR_` in the script with the real paths.

Add a Systemd service:
```
cat <<'ZZZ' > /etc/systemd/system/auto_deploy_latest_commit.service
[Unit]
Description=auto_deploy_latest_commit
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/repository
ExecStart=/opt/repository/auto_deploy_latest_commit.sh
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
ZZZ

systemctl daemon-reload

systemd-analyze verify auto_deploy_latest_commit.service

systemctl start auto_deploy_latest_commit

systemctl status auto_deploy_latest_commit

systemctl enable auto_deploy_latest_commit
```
