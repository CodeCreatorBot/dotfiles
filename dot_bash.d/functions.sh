# Sourced from ~/.bash via the ~/.bash.d/*.sh glob.

funcapp-clean() {
  env -u HTTP_PROXY \
    -u HTTPS_PROXY \
    -u http_proxy \
    -u https_proxy \
    -u ALL_PROXY \
    -u all_proxy \
    -u NODE_USE_ENV_PROXY \
    -u NODE_OPTIONS \
    NO_PROXY="localhost,127.0.0.1,::1,0.0.0.0" \
    no_proxy="localhost,127.0.0.1,::1,0.0.0.0" \
    "$@"
}
