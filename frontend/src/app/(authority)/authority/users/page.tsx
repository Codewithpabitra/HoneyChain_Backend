"use client";

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

import { authService } from "@/services/auth.service";
import type { AuthUser, Role } from "@/types/auth";

export default function AuthorityUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create User modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("beekeeper");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password) {
      setFormError("All fields are required.");
      return;
    }

    try {
      setSubmitting(true);
      await authService.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setIsCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to create user.");
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const farmerCount = users.filter((u) => u.role === "beekeeper").length;
  const processorCount = users.filter((u) => u.role === "processor").length;
  const labCount = users.filter((u) => u.role === "lab").length;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Access Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Platform Users
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Manage Honey Chain users, role credentials, and organization permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(true);
              setFormError(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            <IconPlus size={18} />
            Create User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Users</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : users.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Beekeepers (Farmers)</p>
          <p className="mt-3 text-2xl font-bold text-honey">{loading ? "..." : farmerCount}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Processors</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : processorCount}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Laboratories</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : labCount}
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
        <div className="border-b border-black/10 px-6 py-5 dark:border-white/10">
          <h2 className="font-semibold">Registered User Accounts</h2>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            User accounts with authenticated permissions across the ecosystem.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-black/50 dark:text-white/50">
            <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
            Loading accounts…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center px-6 py-12">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
                <IconUsers size={28} stroke={1.6} />
              </div>

              <h3 className="mt-5 font-semibold">No users found</h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
                Click &quot;Create User&quot; to provision a new user account on Honey Chain.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Org Admin</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {users.map((u) => (
                  <tr key={u.id || u.email} className="transition hover:bg-black/1 dark:hover:bg-white/1">
                    <td className="px-6 py-4 font-semibold text-black dark:text-white">
                      {u.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-black/70 dark:text-white/70">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-honey/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-honey">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isOrgAdmin ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Org Admin
                        </span>
                      ) : (
                        <span className="text-xs text-black/40 dark:text-white/40">Member</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <IconCheck size={14} />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#121212]">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <h3 className="text-lg font-bold">Create Platform User</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marie Curie"
                  className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marie@lab.honeychain.org"
                  className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                  Assigned Platform Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm text-black outline-none focus:border-honey dark:border-white/10 dark:bg-paper-dark dark:text-white"
                >
                  <option value="beekeeper">Beekeeper (Farmer)</option>
                  <option value="processor">Processor (Plant)</option>
                  <option value="lab">Lab (Testing Analyst)</option>
                  <option value="transporter">Transporter (Logistics)</option>
                  <option value="auditor">Auditor (Inspector)</option>
                  <option value="admin">Admin (System Administrator)</option>
                </select>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-500">
                  {formError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <IconLoader2 size={16} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role information */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconShieldCheck size={21} stroke={1.7} />
          </div>

          <div>
            <h2 className="font-semibold">Role-based access</h2>

            <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
              Honey Chain supports role-based access for administrators, beekeepers, processors, laboratory analysts, transporters and auditors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}