set -Eeuo pipefail
umask 077
portal_dir=${1:?Missing destination}
release_id=${2:?Missing release identifier}
[[ "$portal_dir" =~ ^/([A-Za-z0-9_-]+/)+domains/legendadigital\.com\.br/public_html$ ]] || { echo 'Invalid portal destination' >&2; exit 1; }
[[ "$release_id" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release identifier' >&2; exit 1; }
[[ -d "$portal_dir" && "$(cd -P "$portal_dir" && pwd)" == "$portal_dir" ]] || { echo 'Destination missing or symlinked' >&2; exit 1; }
portal_parent=${portal_dir%/public_html}
state_dir="$portal_parent/.ld-portal-deploy"
[[ ! -L "$state_dir" ]] || { echo 'Deployment state cannot be a symlink' >&2; exit 1; }
stage_dir="$state_dir/$release_id"
backup_file="$state_dir/$release_id.before.tar.gz"
[[ -f "$portal_dir/site-runtime.php" && -f "$portal_dir/.htaccess" ]] || { echo 'Hosting configuration missing' >&2; exit 1; }
grep -q 'site-runtime' "$portal_dir/.htaccess" || { echo 'Runtime access guard missing' >&2; exit 1; }
php -r '$c=require $argv[1]; exit(($c["url"]??"") === "https://yltnjgngkomelfltdyky.supabase.co" ? 0 : 1);' "$portal_dir/site-runtime.php"
