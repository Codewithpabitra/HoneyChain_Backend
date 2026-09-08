"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconCheck, IconHome } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";
import { authService } from "@/services/auth.service";
import type { Role } from "@/types/auth";

const roles: Array<{ value: Role; label: string }> = [
  {
    value: "beekeeper",
    label: "Beekeeper",
  },
  {
    value: "processor",
    label: "Processor",
  },
  {
    value: "lab",
    label: "Laboratory Analyst",
  },
  {
    value: "transporter",
    label: "Transporter",
  },
  {
    value: "auditor",
    label: "Auditor",
  },
  {
    value: "admin",
    label: "Administrator",
  },
];

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("beekeeper");
  const [organizationId, setOrganizationId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!FEATURES.register) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 dark:bg-paper-dark">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-sm text-honey">HoneyChain</p>

          <h1 className="mt-4 text-2xl font-medium text-ink dark:text-ink-dark">
            Registration disabled
          </h1>

          <p className="mt-2 text-sm text-ink/60 dark:text-ink-dark/60">
            New accounts are currently provisioned by an administrator.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2.5 text-sm font-medium transition hover:bg-ink/5 dark:border-ink-dark/20 dark:hover:bg-ink-dark/5"
          >
            <IconHome size={17} />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(organizationId.trim()
          ? { organizationId: organizationId.trim() }
          : {}),
      });

      setSuccess(true);
    } catch (err: unknown) {
      const responseError = (
        err as {
          response?: {
            data?: {
              error?: {
                message?: string;
              };
            };
          };
        }
      )?.response?.data?.error?.message;

      setError(
        responseError ??
          "Unable to create the account. Make sure you are signed in as an administrator.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-comb px-16 py-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <HexPattern />

        <div className="relative z-10">
          <span className="font-mono text-sm tracking-tight text-honey-light">
            HoneyChain
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-3xl leading-snug text-paper/95">
            Build a trusted honey ecosystem from the hive to the consumer.
          </p>

          <p className="mt-6 text-sm leading-6 text-paper/60">
            Provision stakeholder accounts for beekeepers, laboratories,
            processors, transporters and authorities.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12 dark:bg-paper-dark">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink/55 transition hover:text-ink dark:text-ink-dark/55 dark:hover:text-ink-dark"
            >
              <IconArrowLeft size={17} />
              Home
            </Link>

            <Link
              href="/login"
              className="text-sm text-ink/55 transition hover:text-honey dark:text-ink-dark/55"
            >
              Sign in
            </Link>
          </div>

          <h1 className="text-2xl font-medium text-ink dark:text-ink-dark">
            Create account
          </h1>

          <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60">
            Provision a HoneyChain stakeholder account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field
              id="name"
              label="Full name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Rajesh Kumar"
              autoComplete="name"
              required
            />

            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@honeychain.org"
              autoComplete="email"
              required
            />

            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={6}
            />

            <div>
              <label
                htmlFor="role"
                className="mb-1.5 block text-sm text-ink/80 dark:text-ink-dark/80"
              >
                Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="w-full rounded-md border border-ink/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-honey dark:border-ink-dark/20 dark:text-ink-dark"
              >
                {roles.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    className="bg-paper text-ink dark:bg-paper-dark dark:text-ink-dark"
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <Field
              id="organizationId"
              label="Organization ID"
              type="text"
              value={organizationId}
              onChange={setOrganizationId}
              placeholder="Optional MongoDB ObjectId"
            />

            {error && (
              <p
                role="alert"
                className="rounded-md bg-alert/10 px-3.5 py-2.5 text-sm text-alert"
              >
                {error}
              </p>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-md bg-verified/10 px-3.5 py-2.5 text-sm text-verified"
              >
                <IconCheck size={18} className="mt-0.5 shrink-0" />

                <span>
                  Account created successfully. You can now sign in with the new
                  credentials.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-md bg-honey px-4 py-2.5 text-sm font-medium text-comb transition-colors",
                "hover:bg-honey-light disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>

            {success && (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-md border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5 dark:border-ink-dark/20 dark:text-ink-dark dark:hover:bg-ink-dark/5"
              >
                Continue to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm text-ink/80 dark:text-ink-dark/80"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-ink-dark/20 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
      />
    </div>
  );
}

function HexPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 -top-16 h-105 w-105 text-paper/6"
      viewBox="0 0 200 200"
      fill="none"
    >
      {Array.from({ length: 5 }).flatMap((_, row) =>
        Array.from({ length: 5 }).map((__, col) => {
          const x = col * 34 + (row % 2 === 0 ? 0 : 17);
          const y = row * 30;

          return (
            <polygon
              key={`${row}-${col}`}
              points="10,0 20,5.8 20,17.3 10,23.1 0,17.3 0,5.8"
              transform={`translate(${x}, ${y})`}
              stroke="currentColor"
              strokeWidth="1"
            />
          );
        }),
      )}
    </svg>
  );
}
