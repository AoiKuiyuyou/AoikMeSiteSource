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

    git fetch >/dev/null 2>&1 &&
    git checkout --force master >/dev/null 2>&1 &&
    git reset --hard remotes/origin/master >/dev/null 2>&1 &&
    rm -rf /opt/aoikme/dst/blog >/dev/null 2>&1 &&
    cp -a release /opt/aoikme/dst/blog >/dev/null 2>&1
done;
