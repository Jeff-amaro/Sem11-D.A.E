import { useCallback, useEffect, useRef, useState } from "react";

const IDLE = { status: "idle", plan: null, result: null, error: null };

export default function useAgentRun(runAgent) {
  const [run, setRun] = useState(IDLE);
  const latestRef = useRef(IDLE);
  const controllerRef = useRef(null);

  const update = useCallback((next) => {
    latestRef.current = next;
    setRun(next);
  }, []);

  const start = useCallback(
    (plan) => {
      if (!runAgent) return;

      const current = latestRef.current;
      if (current.status === "running" || current.status === "awaiting_approval") return;

      const controller = new AbortController();
      controllerRef.current = controller;
      update({ status: "running", plan, result: null, error: null });

      runAgent(plan, { signal: controller.signal }).then(
        (result) => {
          if (controller.signal.aborted) return;
          if (plan?.risk === "R2") {
            update({ status: "awaiting_approval", plan, result, error: null });
          } else {
            update({ status: "done", plan, result, error: null });
          }
        },
        (error) => {
          if (controller.signal.aborted) return;
          update({ status: "error", plan, result: null, error });
        }
      );
    },
    [runAgent, update]
  );

  const approve = useCallback(() => {
    if (latestRef.current.status !== "awaiting_approval") return;
    update({ ...latestRef.current, status: "done" });
  }, [update]);

  const reject = useCallback(() => {
    const current = latestRef.current;
    if (current.status !== "running" && current.status !== "awaiting_approval") return;
    controllerRef.current?.abort();
    update(IDLE);
  }, [update]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { ...run, start, approve, reject };
}
