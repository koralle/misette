import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { authClient } from "../lib/auth-client.ts";

const IndexComponent = () => {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasError = error !== null;

  const signUp = async () => {
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({
      email,
      name,
      password,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Sign up failed");
    }
  };

  const signIn = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
    }
  };

  const signOut = async () => {
    setError(null);
    await authClient.signOut();
  };

  return (
    <div className="p-2">
      <h1>Hello, world!</h1>
      <p>Welcome to TanStack Router SPA on Vite + Cloudflare Workers.</p>
      <hr />
      {isPending ? <p>Loading session…</p> : null}
      {session ? (
        <div>
          <p>
            Signed in as {session.user.name} ({session.user.email})
          </p>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            void signIn(event);
          }}
        >
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </div>
          {hasError ? <p>{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            Sign in
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              void signUp();
            }}
          >
            Sign up
          </button>
        </form>
      )}
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: IndexComponent,
});
