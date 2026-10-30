<?php

return [
    /*
     * Comma-separated IPs / CIDR ranges allowed to reach /api/admin.
     * Empty = no restriction (development only). In production this should
     * list only the admin server / internal network ranges.
     */
    'allowed_ips' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADMIN_ALLOWED_IPS', ''))))),

    // Absolute lifetime of an authenticated admin session (minutes).
    'session_lifetime' => (int) env('ADMIN_SESSION_LIFETIME', 480),

    // Sessions with no activity for this long are revoked (minutes).
    'idle_timeout' => (int) env('ADMIN_IDLE_TIMEOUT', 30),
];
