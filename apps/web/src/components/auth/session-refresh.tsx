"use client";

import { useCallback, useEffect, useRef } from "react";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const MINIMUM_INTERVAL_MS = 60 * 1000;

export function SessionRefresh() {
  const refreshing = useRef<Promise<boolean> | null>(null);
  const lastRefresh = useRef(0);

  const renew = useCallback(async () => {
    const now = Date.now();

    if (now - lastRefresh.current < MINIMUM_INTERVAL_MS) {
      return true;
    }

    if (refreshing.current) {
      return refreshing.current;
    }

    refreshing.current = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => {
        if (response.ok) {
          lastRefresh.current = Date.now();
          return true;
        }

        if (response.status === 401) {
          window.location.replace("/login?sessionExpired=1");
        }

        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshing.current = null;
      });

    return refreshing.current;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void renew();
      }
    }, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void renew();
      }
    };

    const onFocus = () => {
      void renew();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [renew]);

  return null;
}
