#!/usr/bin/env bash
set -Eeuo pipefail
: "${HOSTINGER_SSH_HOST:?}" "${HOSTINGER_SSH_PORT:?}" "${HOSTINGER_SSH_USER:?}" "${HOSTINGER_REMOTE_DIR:?}"
: "${HOSTINGER_SSH_PRIVATE_KEY:?}" "${HOSTINGER_SSH_KNOWN_HOSTS:?}" "${GITHUB_SHA:?}" "${GITHUB_RUN_ID:?}" "${GITHUB_RUN_ATTEMPT:?}"
[[ "$HOSTINGER_SSH_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]] || exit 1
[[ "$HOSTINGER_SSH_USER" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || exit 1
[[ "$HOSTINGER_SSH_PORT" =~ ^[0-9]{1,5}$ && "$HOSTINGER_SSH_PORT" -ge 1 && "$HOSTINGER_SSH_PORT" -le 65535 ]] || exit 1
[[ "$HOSTINGER_REMOTE_DIR" =~ ^/([A-Za-z0-9_-]+/)+domains/legendadigital\.com\.br/public_html$ ]] || exit 1
release_id="$GITHUB_SHA-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
[[ "$release_id" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 1
ssh_dir=$(mktemp -d)
trap 'rm -rf -- "$ssh_dir"' EXIT
chmod 700 "$ssh_dir"
printf '%s\n' "$HOSTINGER_SSH_PRIVATE_KEY" > "$ssh_dir/key"
printf '%s\n' "$HOSTINGER_SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/key" "$ssh_dir/known_hosts"
ssh-keygen -y -P '' -f "$ssh_dir/key" >/dev/null
if [[ "$HOSTINGER_SSH_PORT" == 22 ]]; then lookup=$HOSTINGER_SSH_HOST; else lookup="[$HOSTINGER_SSH_HOST]:$HOSTINGER_SSH_PORT"; fi
ssh-keygen -F "$lookup" -f "$ssh_dir/known_hosts" >/dev/null || { echo 'Pinned server identity missing' >&2; exit 1; }
ssh_args=(-i "$ssh_dir/key" -p "$HOSTINGER_SSH_PORT" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ssh_dir/known_hosts" -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o LogLevel=ERROR)
target="$HOSTINGER_SSH_USER@$HOSTINGER_SSH_HOST"
remote_step() {
  local script=$1
  shift
  cat scripts/deploy/remote_common.sh "$script" | ssh "${ssh_args[@]}" "$target" "bash -s -- '$HOSTINGER_REMOTE_DIR' '$release_id' $*"
}
remote_step scripts/deploy/remote_prepare.sh
stage_dir="${HOSTINGER_REMOTE_DIR%/public_html}/.ld-portal-deploy/$release_id"
# Validated arguments contain no shell metacharacters. Archive travels on stdin.
ssh "${ssh_args[@]}" "$target" "cat > '$stage_dir/package.tar.gz'" < .portal-release/portal.tar.gz
archive_sha=$(sha256sum .portal-release/portal.tar.gz | cut -d ' ' -f 1)
remote_step scripts/deploy/remote_publish.sh "'$archive_sha'"
if ! python3 scripts/deploy/smoke.py .portal-release/expected-assets.json "$release_id"; then
  echo 'Production smoke failed; requesting restore of this release backup' >&2
  remote_step scripts/deploy/remote_rollback.sh
  exit 1
fi
printf 'Portal deploy and smoke completed for commit %s\n' "$GITHUB_SHA" >> "$GITHUB_STEP_SUMMARY"
