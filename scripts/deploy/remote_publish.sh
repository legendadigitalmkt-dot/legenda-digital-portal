# remote_common.sh is prepended by the caller.
archive_sha=${3:?Missing archive hash}
[[ "$archive_sha" =~ ^[a-f0-9]{64}$ ]] || exit 1
[[ -d "$stage_dir" && ! -L "$stage_dir" ]] || exit 1
cd "$stage_dir"
printf '%s  package.tar.gz\n' "$archive_sha" | sha256sum --check --status
# Our archive contains regular files only; reject links and path traversal.
tar -tzf package.tar.gz > entries.txt
while IFS= read -r entry; do
  [[ "$entry" =~ ^([A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+$ ]] || exit 1
  [[ "/$entry/" != *'/../'* && "/$entry/" != *'/./'* ]] || exit 1
  [[ "$entry" != 'site-runtime.php' && "$entry" != '.htaccess' && "$entry" != .env* ]] || exit 1
done < entries.txt
tar -tvzf package.tar.gz > types.txt
[[ -z "$(awk 'substr($1,1,1)!="-" {print}' types.txt)" ]] || { echo 'Archive links or directories rejected' >&2; exit 1; }
mkdir -m 700 payload
tar -xzf package.tar.gz -C payload --no-same-owner
cd payload
sha256sum --check --quiet release-files.sha256
[[ -f index.html && -f index.php && -f sitemap.php && -f favicon.ico && -d assets ]] || exit 1
php -l index.php >/dev/null
php -l sitemap.php >/dev/null
# Backup must finish before any live file is changed. Backups are kept outside public_html.
[[ ! -e "$backup_file" ]] || exit 1
tar -czf "$backup_file" -C "$portal_dir" .
chmod 600 "$backup_file"
restore_on_error() {
  trap - ERR
  echo 'Publish failed; restoring previous publication' >&2
  tar -xzf "$backup_file" -C "$portal_dir"
  exit 1
}
trap restore_on_error ERR
# Keep old hashed assets for open tabs and rollback. Never use --delete.
rsync -rtp --delay-updates --chmod=D755,F644 assets/ "$portal_dir/assets/"
rsync -rtp --delay-updates --chmod=D755,F644 --exclude=assets/ --exclude=site-runtime.php --exclude=.htaccess --exclude=release-files.sha256 ./ "$portal_dir/"
trap - ERR
echo 'Portal files published; backup retained outside public_html'
