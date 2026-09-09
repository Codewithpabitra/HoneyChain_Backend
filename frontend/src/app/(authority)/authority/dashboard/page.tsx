// src/app/(authority)/authority/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconBuildingCommunity,
  IconCheck,
  IconClock,
  IconFileDescription,
  IconHexagon,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { organizationService } from "@/services/organization.service";
import type {
  OrganizationApplication,
  ApplicationStatus,
  ProposedMember,
} from "@/types/organization";

// Auditor default modules
const auditorModules = [
  {
    title: "Farmers",
    description: "Monitor registered beekeepers and their apiary operations.",
    href: "/authority/farmers",
    icon: IconUsers,
  },
  {
    title: "Hive Monitoring",
    description: "View hive health, telemetry and AI-based risk indicators.",
    href: "/authority/hives",
    icon: IconHexagon,
  },
  {
    title: "Clusters",
    description: "Monitor beekeeping clusters and regional activity.",
    href: "/authority/clusters",
    icon: IconBuildingCommunity,
  },
  {
    title: "Blockchain",
    description: "Inspect traceability records and on-chain activity.",
    href: "/authority/blockchain",
    icon: IconShieldCheck,
  },
];

export default function AuthorityDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Organization requests state (Admin)
  const [applications, setApplications] = useState<OrganizationApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("PENDING");
  const [selectedApp, setSelectedApp] = useState<OrganizationApplication | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Approval result
  const [approvalResult, setApprovalResult] = useState<{
    orgName: string;
    walletAddress: string;
    status: string;
    activationUrl?: string;
  } | null>(null);

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingApps(true);
    try {
      const filter = statusFilter === "ALL" ? undefined : statusFilter;
      const res = await organizationService.getApplications({ status: filter });
      setApplications(res.data || []);
    } catch {
      // Handled silently or empty state displayed
    } finally {
      setIsLoadingApps(false);
    }
  }, [isAdmin, statusFilter]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isAdmin) return;
      setIsLoadingApps(true);
      try {
        const filter = statusFilter === "ALL" ? undefined : statusFilter;
        const res = await organizationService.getApplications({ status: filter });
        if (active) {
          setApplications(res.data || []);
        }
      } catch {
        // Handled silently
      } finally {
        if (active) {
          setIsLoadingApps(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [isAdmin, statusFilter]);

  // Open review modal
  function handleOpenReview(app: OrganizationApplication) {
    setSelectedApp(app);
    setApprovalResult(null);
    setActionError(null);
    setIsReviewOpen(true);
  }

  // Handle Approve
  async function handleApprove(appId: string) {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await organizationService.approveApplication(appId);
      const org = res.data.organization;
      const activation = res.data.activation;

      setApprovalResult({
        orgName: org.name,
        walletAddress: org.walletAddress,
        status: org.status,
        activationUrl: activation?.activationUrl,
      });

      // Refresh list
      await fetchApplications();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to approve organization application.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Reject
  async function handleReject(appId: string) {
    if (!rejectionReason.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await organizationService.rejectApplication(appId, rejectionReason.trim());
      setIsRejectOpen(false);
      setIsReviewOpen(false);
      setRejectionReason("");
      await fetchApplications();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to reject organization application.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            {isAdmin ? "HoneyChain Platform Administration" : "Compliance & Monitoring"}
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? "Admin Dashboard" : "Auditor Dashboard"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
            {isAdmin
              ? "Oversee organization onboarding applications, provision stakeholder blockchain identities, and administer platform users."
              : "Monitor beekeeping operations, honey traceability, hive health and blockchain-backed records across registered clusters."}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={fetchApplications}
            disabled={isLoadingApps}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark dark:hover:bg-white/8"
          >
            <IconRefresh size={16} className={isLoadingApps ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>

      {/* Admin Organization Requests Section */}
      {isAdmin && (
        <section id="requests" className="mb-10">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <IconBuildingCommunity size={22} className="text-honey" />
                <h2 className="text-xl font-bold tracking-tight">Organization Requests</h2>
              </div>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Review pending registration applications, verify documentation, and approve on-chain identities.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
              {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === tab
                      ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                      : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
                  }`}
                >
                  {tab === "PENDING"
                    ? `Pending (${pendingCount})`
                    : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table / Cards */}
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
            {isLoadingApps ? (
              <div className="flex items-center justify-center p-12 text-sm text-black/50 dark:text-white/50">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
                Loading organization applications…
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10 text-honey">
                  <IconBuildingCommunity size={24} />
                </div>
                <h3 className="mt-4 font-semibold text-ink dark:text-ink-dark">
                  No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} applications
                </h3>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Applications submitted by prospective organizations will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                    <tr>
                      <th className="px-5 py-3.5">Organization</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Primary Contact</th>
                      <th className="px-5 py-3.5">Official Email</th>
                      <th className="px-5 py-3.5">Submitted</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {applications.map((app) => (
                      <tr
                        key={app._id}
                        className="transition hover:bg-black/1 dark:hover:bg-white/1"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-ink dark:text-ink-dark">
                            {app.organizationName}
                          </div>
                          {app.registrationNumber && (
                            <div className="font-mono text-xs text-black/40 dark:text-white/40">
                              Reg: {app.registrationNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-honey/10 px-2 py-0.5 text-xs font-medium capitalize text-honey">
                            {app.organizationType}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-ink dark:text-ink-dark">{app.adminName}</div>
                          <div className="text-xs text-black/50 dark:text-white/50">
                            {app.adminEmail}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-black/60 dark:text-white/60">
                          {app.contactEmail}
                        </td>
                        <td className="px-5 py-4 text-xs text-black/50 dark:text-white/50">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenReview(app)}
                            className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-honey hover:text-honey dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {isReviewOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/10 bg-paper p-6 shadow-2xl dark:border-white/10 dark:bg-paper-dark">
            <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-ink dark:text-ink-dark">
                    {selectedApp.organizationName}
                  </h3>
                  <StatusBadge status={selectedApp.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-black/50 dark:text-white/50">
                  Ref: {selectedApp.applicationId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-ink dark:text-white/40 dark:hover:bg-white/5"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Approval Success Banner */}
            {approvalResult && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                  <IconCheck size={18} />
                  Organization Approved & Active
                </div>
                <p className="mt-1 text-ink/80 dark:text-ink-dark/80">
                  Status: <strong className="capitalize text-emerald-600 dark:text-emerald-400">{approvalResult.status}</strong>
                </p>
                <div className="mt-2">
                  <span className="text-black/60 dark:text-white/60">Assigned Blockchain Address:</span>
                  <p className="mt-0.5 break-all font-mono font-bold text-ink dark:text-ink-dark">
                    {approvalResult.walletAddress}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-black/50 dark:text-white/50">
                  Security guarantee: Blockchain private keys are securely maintained on the server and are never displayed or exposed.
                </p>
              </div>
            )}

            {/* Error banner */}
            {actionError && (
              <div className="mt-4 rounded-xl bg-alert/10 p-3 text-xs text-alert">
                {actionError}
              </div>
            )}

            {/* Application Data Grid */}
            <div className="mt-5 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-black/2 p-3.5 dark:border-white/5 dark:bg-white/2">
                  <span className="text-xs text-black/50 dark:text-white/50">Organization Type</span>
                  <p className="mt-0.5 font-semibold capitalize text-ink dark:text-ink-dark">
                    {selectedApp.organizationType}
                  </p>
                </div>

                <div className="rounded-xl border border-black/5 bg-black/2 p-3.5 dark:border-white/5 dark:bg-white/2">
                  <span className="text-xs text-black/50 dark:text-white/50">Registration / License No.</span>
                  <p className="mt-0.5 font-semibold text-ink dark:text-ink-dark">
                    {selectedApp.registrationNumber || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-black/5 bg-black/2 p-3.5 dark:border-white/5 dark:bg-white/2">
                  <span className="text-xs text-black/50 dark:text-white/50">Official Email</span>
                  <p className="mt-0.5 font-semibold text-ink dark:text-ink-dark">
                    {selectedApp.contactEmail}
                  </p>
                </div>

                <div className="rounded-xl border border-black/5 bg-black/2 p-3.5 dark:border-white/5 dark:bg-white/2">
                  <span className="text-xs text-black/50 dark:text-white/50">Phone Number</span>
                  <p className="mt-0.5 font-semibold text-ink dark:text-ink-dark">
                    {selectedApp.contactPhone || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-black/5 bg-black/2 p-3.5 dark:border-white/5 dark:bg-white/2">
                <span className="text-xs text-black/50 dark:text-white/50">Physical Address</span>
                <p className="mt-0.5 font-medium text-ink dark:text-ink-dark">
                  {selectedApp.address || "Not provided"}
                </p>
              </div>

              {/* Primary Contact (Admin) */}
              <div className="rounded-xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-honey">
                  Primary Contact (Designated Admin)
                </h4>
                <div className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <span className="text-xs text-black/50 dark:text-white/50">Name: </span>
                    <strong className="font-semibold text-ink dark:text-ink-dark">
                      {selectedApp.adminName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-black/50 dark:text-white/50">Email: </span>
                    <strong className="font-semibold text-ink dark:text-ink-dark">
                      {selectedApp.adminEmail}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="rounded-xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-honey">
                  Supporting Documents ({selectedApp.documents?.length || 0})
                </h4>
                {selectedApp.documents && selectedApp.documents.length > 0 ? (
                  <div className="mt-2.5 space-y-2">
                    {selectedApp.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-black/5 bg-white p-2.5 dark:border-white/5 dark:bg-white/4"
                      >
                        <div className="flex items-center gap-2">
                          <IconFileDescription size={18} className="text-honey" />
                          <span className="font-medium text-ink dark:text-ink-dark">
                            {doc.name}
                          </span>
                        </div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${doc.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-honey hover:underline"
                        >
                          View PDF
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    No documents attached to this application.
                  </p>
                )}
              </div>

              {/* Proposed Members */}
              {Array.isArray(selectedApp.metadata?.proposedMembers) &&
                (selectedApp.metadata.proposedMembers as ProposedMember[]).length > 0 && (
                  <div className="rounded-xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-honey">
                      Proposed Members ({(selectedApp.metadata.proposedMembers as ProposedMember[]).length})
                    </h4>
                    <div className="mt-2.5 space-y-1.5">
                      {(selectedApp.metadata.proposedMembers as ProposedMember[]).map((m: ProposedMember, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-black/2 p-2 text-xs dark:bg-white/2"
                        >
                          <span className="font-medium text-ink dark:text-ink-dark">
                            {m.name} ({m.email})
                          </span>
                          <span className="capitalize text-black/50 dark:text-white/50">
                            {m.role || selectedApp.organizationType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Already Approved Display */}
              {selectedApp.status === "APPROVED" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Status: Active HoneyChain Participant
                  </div>
                  {selectedApp.organizationId && (
                    <div className="mt-1.5">
                      <span className="text-black/50 dark:text-white/50">Public Wallet: </span>
                      <span className="font-mono font-medium text-ink dark:text-ink-dark">
                        {selectedApp.organizationId.walletAddress}
                      </span>
                    </div>
                  )}
                  {selectedApp.approvedAt && (
                    <div className="mt-1 text-black/50 dark:text-white/50">
                      Approved on: {new Date(selectedApp.approvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Already Rejected Display */}
              {selectedApp.status === "REJECTED" && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs">
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    Status: Rejected
                  </div>
                  <div className="mt-1 text-ink dark:text-ink-dark">
                    Reason: {selectedApp.rejectionReason}
                  </div>
                  {selectedApp.rejectedAt && (
                    <div className="mt-1 text-black/50 dark:text-white/50">
                      Rejected on: {new Date(selectedApp.rejectedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-black/5 dark:border-white/10 dark:text-ink-dark dark:hover:bg-white/5"
              >
                Close
              </button>

              {selectedApp.status === "PENDING" && !approvalResult && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRejectOpen(true)}
                    disabled={actionLoading}
                    className="rounded-xl border border-alert/30 px-4 py-2.5 text-xs font-semibold text-alert transition hover:bg-alert/10 disabled:opacity-50"
                  >
                    Reject Application
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedApp._id)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-xs font-semibold text-comb transition hover:bg-honey-light disabled:opacity-50"
                  >
                    {actionLoading && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-comb border-t-transparent" />
                    )}
                    Approve Organization
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && selectedApp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-paper p-6 shadow-2xl dark:border-white/10 dark:bg-paper-dark">
            <h3 className="text-lg font-bold text-ink dark:text-ink-dark">
              Reject Application
            </h3>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Provide a clear reason for rejecting the onboarding request of &quot;{selectedApp.organizationName}&quot;.
            </p>

            <div className="mt-4">
              <label
                htmlFor="reason"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
              >
                Rejection Reason *
              </label>
              <textarea
                id="reason"
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Missing valid state certification or incomplete registration documentation."
                className="w-full rounded-xl border border-black/15 bg-transparent p-3 text-xs text-ink outline-none placeholder:text-ink/35 focus:border-alert dark:border-white/15 dark:text-ink-dark"
              />
            </div>

            {actionError && (
              <p className="mt-2 text-xs text-alert">{actionError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectOpen(false);
                  setActionError(null);
                }}
                className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-ink hover:bg-black/5 dark:border-white/10 dark:text-ink-dark"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleReject(selectedApp._id)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="rounded-xl bg-alert px-4 py-2 text-xs font-semibold text-white hover:bg-alert/90 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules (Auditor view or general monitoring) */}
      {!isAdmin && (
        <div className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Monitoring Modules</h2>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Access operational and traceability information.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {auditorModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-honey/40 hover:shadow-lg hover:shadow-black/5 dark:border-white/10 dark:bg-white/3 dark:hover:border-honey/40 dark:hover:shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl bg-honey/10 p-3 text-honey">
                      <Icon size={22} stroke={1.8} />
                    </div>

                    <IconArrowUpRight
                      size={19}
                      className="text-black/30 transition group-hover:text-honey dark:text-white/30 dark:group-hover:text-honey"
                    />
                  </div>

                  <h3 className="mt-5 font-semibold">{module.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                    {module.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Traceability / Blockchain banner */}
      <div className="mt-8 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconShieldCheck size={19} className="text-honey" />
              <h2 className="font-semibold">Decentralized Provenance Network</h2>
            </div>

            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              Ethereum Sepolia batch verification, smart contracts, and tamper-proof honey records.
            </p>
          </div>

          <Link
            href="/authority/blockchain"
            className="inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View blockchain
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <IconCheck size={12} stroke={2.5} />
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
        <IconAlertTriangle size={12} stroke={2.5} />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <IconClock size={12} stroke={2.5} />
      Pending
    </span>
  );
}