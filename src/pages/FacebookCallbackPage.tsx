import { useEffect, useMemo } from "react";

export default function FacebookCallbackPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const payload = Object.fromEntries(params.entries());

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: "META_EMBEDDED_SIGNUP_CODE",
        payload,
      }, window.location.origin);
    }

    window.setTimeout(() => window.close(), 150);
  }, [params]);

  return null;
}