# remote_common.sh is prepended by the caller.
command -v rsync >/dev/null
command -v sha256sum >/dev/null
mkdir -p -m 700 "$state_dir"
[[ "$(cd -P "$state_dir" && pwd)" == "$state_dir" ]] || exit 1
mkdir -m 700 "$stage_dir"
echo 'Private staging directory prepared'
