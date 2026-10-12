# remote_common.sh is prepended by the caller.
[[ -f "$backup_file" && ! -L "$backup_file" ]] || { echo 'Release backup unavailable' >&2; exit 1; }
tar -tzf "$backup_file" >/dev/null
tar -xzf "$backup_file" -C "$portal_dir"
echo 'Previous portal publication restored; newer unreferenced assets retained'
