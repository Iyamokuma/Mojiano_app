import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_KEY = "mojiano-chunk-reload";

/** After a deploy the previous build's JS files are gone, so a long-open tab fails to load the next screen. */
export function isStaleChunkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(
    message,
  );
}

/** Reload once to pick up the new build; the flag stops a loop if the files really are missing. */
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked: reload anyway */
  }
  window.location.reload();
  return true;
}

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    if (isStaleChunkError(error)) reloadForNewBuild();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-3xl">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted">
            {isStaleChunkError(error)
              ? "A newer version of Mojiano is live. Reload to continue."
              : "This screen hit an error. Reloading usually fixes it."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm text-white"
          >
            Reload
          </button>
          <p className="mt-6 break-words text-xs text-muted/80">{error.message}</p>
        </div>
      </div>
    );
  }
}
