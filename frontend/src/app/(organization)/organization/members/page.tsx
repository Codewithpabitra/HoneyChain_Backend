// src/app/(organization)/organization/members/page.tsx
"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  IconCheck,
  IconCopy,
  IconLock,
  IconMail,
  IconPlus,
  IconShield,
  IconShieldCheck,
  IconUser,
  IconUsers,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { organizationService } from "@/services/organization.service";
import type {
  OrganizationMember,
  OrganizationProfileResponse,
} from "@/types/organization";
import type { Role } from "@/types/auth";
import { ROLE_LABELS } from "@/lib/constants";

export default function OrganizationMembersPage() {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState<OrganizationProfileResponse | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user?.role || "beekeeper");
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Status toggle state
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch organization profile
      const orgRes = await organizationService.getMyOrganization();
      setProfileData(orgRes.data);

      // 2. Fetch members list
      const membersRes = await organizationService.getMyMembers();
      setMembers(membersRes.data || []);

      // Default role to organization role
      if (orgRes.data?.organization?.role) {
        setRole(orgRes.data.organization.role as Role);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to load organization members. Ensure you have an active Organization Admin session.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const orgRes = await organizationService.getMyOrganization();
        if (active) setProfileData(orgRes.data);
        const membersRes = await organizationService.getMyMembers();
        if (active) setMembers(membersRes.data || []);
        if (active && orgRes.data?.organization?.role) {
          setRole(orgRes.data.organization.role as Role);
        }
      } catch (err: unknown) {
        if (active) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
              ?.response?.data?.error?.message ??
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Failed to load organization members. Ensure you have an active Organization Admin session.";
          setError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Handle Add Member
  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setModalError(null);

    if (!name.trim()) {
      setModalError("Member name is required.");
      return;
    }
    if (!email.trim()) {
      setModalError("Member email is required.");
      return;
    }
    if (password.length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationService.addMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        isOrgAdmin,
      });

      setIsAddModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setIsOrgAdmin(false);

      // Reload members list
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add organization member.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Toggle Active/Inactive
  async function handleToggleStatus(member: OrganizationMember) {
    // Prevent self-deactivation
    if (member._id === user?.id || member.id === user?.id) {
      return;
    }

    setUpdatingMemberId(member._id);
    try {
      await organizationService.updateMemberStatus(member._id, !member.isActive);
      // Update local state optimistically
      setMembers((prev) =>
        prev.map((m) =>
          m._id === member._id ? { ...m, isActive: !m.isActive } : m
        )
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        "Failed to update member status.";
      setError(msg);
    } finally {
      setUpdatingMemberId(null);
    }
  }

  function handleCopyWallet(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  }

  const activeCount = members.filter((m) => m.isActive).length;
  const org = profileData?.organization;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Tenant Organization Administration
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            Team Members
          </h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Manage your organization&apos;s authorized members, permissions, and operational access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb transition hover:bg-honey-light"
        >
          <IconPlus size={18} />
          Add Member
        </button>
      </div>

      {/* Organization Details Card */}
      {org && (
        <div className="mb-8 rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/3">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey/10 text-honey">
                  <IconShield size={22} stroke={1.8} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-ink dark:text-ink-dark">
                      {org.name}
                    </h2>
                    <span className="rounded-md bg-honey/10 px-2 py-0.5 text-xs font-semibold capitalize text-honey">
                      {org.role || org.organizationType}
                    </span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Active Organization
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                    <span>Public Blockchain Identity:</span>
                    <span className="font-mono text-ink dark:text-ink-dark">
                      {org.walletAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyWallet(org.walletAddress)}
                      className="text-black/40 hover:text-honey dark:text-white/40"
                      title="Copy Address"
                    >
                      {copiedWallet ? <IconCheck size={14} className="text-emerald-500" /> : <IconCopy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 border-t border-black/10 pt-4 dark:border-white/10 md:border-t-0 md:pt-0">
              <div className="text-center">
                <span className="text-xs text-black/50 dark:text-white/50">Total</span>
                <p className="text-2xl font-bold text-ink dark:text-ink-dark">
                  {members.length}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-black/50 dark:text-white/50">Active</span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {activeCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-alert/10 p-4 text-sm text-alert">
          <IconAlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
        <div className="border-b border-black/10 px-6 py-4 dark:border-white/10">
          <h3 className="font-semibold text-ink dark:text-ink-dark">Organization Members</h3>
          <p className="text-xs text-black/50 dark:text-white/50">
            Authenticated members authorized to operate on behalf of {org?.name || "your organization"}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-black/50 dark:text-white/50">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
            Loading organization members…
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10 text-honey">
              <IconUsers size={24} />
            </div>
            <h4 className="mt-4 font-semibold text-ink dark:text-ink-dark">No members added yet</h4>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Invite team members to participate in your organization operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Admin Rights</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {members.map((member) => {
                  const isCurrentUser =
                    member._id === user?.id || member.id === user?.id;

                  return (
                    <tr
                      key={member._id}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-honey/15 font-semibold text-honey">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-ink dark:text-ink-dark">
                              {member.name} {isCurrentUser && <span className="text-xs text-honey font-normal">(You)</span>}
                            </div>
                            <div className="text-xs text-black/50 dark:text-white/50">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="capitalize text-black/70 dark:text-white/70">
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {member.isOrgAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-honey/15 px-2 py-0.5 text-xs font-semibold text-honey">
                            <IconShieldCheck size={13} />
                            Org Admin
                          </span>
                        ) : (
                          <span className="text-xs text-black/40 dark:text-white/40">
                            Member
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {member.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isCurrentUser ? (
                          <span className="text-xs text-black/30 dark:text-white/30" title="You cannot deactivate your own account">
                            Current User
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(member)}
                            disabled={updatingMemberId === member._id}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              member.isActive
                                ? "border border-alert/30 text-alert hover:bg-alert/10"
                                : "border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            }`}
                          >
                            {updatingMemberId === member._id
                              ? "Updating…"
                              : member.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-paper p-6 shadow-2xl dark:border-white/10 dark:bg-paper-dark">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <h3 className="text-lg font-bold text-ink dark:text-ink-dark">
                Add Organization Member
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-ink dark:text-white/40"
              >
                <IconX size={19} />
              </button>
            </div>

            {modalError && (
              <p className="mt-3 rounded-xl bg-alert/10 p-3 text-xs text-alert">
                {modalError}
              </p>
            )}

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="memberName"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    id="memberName"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suresh Sen"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  />
                  <IconUser
                    size={16}
                    className="absolute right-3.5 top-3 text-ink/35 dark:text-ink-dark/35"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="memberEmail"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    id="memberEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@organization.org"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  />
                  <IconMail
                    size={16}
                    className="absolute right-3.5 top-3 text-ink/35 dark:text-ink-dark/35"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="memberPassword"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Initial Password *
                </label>
                <div className="relative">
                  <input
                    id="memberPassword"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  />
                  <IconLock
                    size={16}
                    className="absolute right-3.5 top-3 text-ink/35 dark:text-ink-dark/35"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink/40 dark:text-ink-dark/40">
                  Minimum 6 characters. The member can use this password to sign in immediately.
                </p>
              </div>

              <div>
                <label
                  htmlFor="memberRole"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Permitted Role
                </label>
                <input
                  id="memberRole"
                  type="text"
                  readOnly
                  value={ROLE_LABELS[role] || role}
                  className="w-full rounded-xl border border-black/10 bg-black/3 px-3.5 py-2.5 text-xs font-medium capitalize text-ink/70 dark:border-white/10 dark:bg-white/3 dark:text-ink-dark/70"
                />
                <p className="mt-1 text-[11px] text-ink/40 dark:text-ink-dark/40">
                  Members automatically inherit your organization&apos;s permitted role.
                </p>
              </div>

              <div className="rounded-xl border border-black/10 bg-black/2 p-3.5 dark:border-white/10 dark:bg-white/2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isOrgAdmin}
                    onChange={(e) => setIsOrgAdmin(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-black/20 text-honey focus:ring-honey"
                  />
                  <div>
                    <span className="text-xs font-semibold text-ink dark:text-ink-dark">
                      Grant Organization Administrator Privileges
                    </span>
                    <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                      Allows this member to manage team members and view organization profile data.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-black/5 dark:border-white/10 dark:text-ink-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-honey px-5 py-2 text-xs font-semibold text-comb transition hover:bg-honey-light disabled:opacity-50"
                >
                  {isSubmitting ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
