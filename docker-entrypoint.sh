#!/bin/sh
# Inject runtime env vars into a JS file the browser can read
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}"
};
EOF

exec nginx -g 'daemon off;'
