#!/usr/bin/env sh
# Refuse commits made under a work identity — this repo is personal (me@yanai.sh).
# Lives in its own LF script (see .gitattributes) because lefthook's inline
# multi-line runner mis-parses the `case` block on Windows Git Bash.
email="$(git config user.email)"
case "$email" in
  *@kardome.com | *kardome* | *klugman.yanai*)
    echo "lefthook: refusing to commit — configured user.email is '$email'." >&2
    echo "lefthook: this repo is personal; expected me@yanai.sh." >&2
    exit 1
    ;;
esac
