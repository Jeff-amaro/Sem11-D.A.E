import { useCallback, useEffect, useState } from "react";

export default function usePlans(fetchPlans) {
  const [status, setStatus] = useState("loading");
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setPlans([]);
    setStatus("loading");
    setError(null);

    fetchPlans()
      .then((data) => {
        if (cancelled) return;
        setPlans(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus("error");
        setPlans([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPlans, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((previous) => previous + 1);
  }, []);

  return { status, plans, error, reload };
}
