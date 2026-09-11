// src/app/(auth)/register/page.tsx
"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCheck,
  IconFileDescription,
  IconPlus,
  IconTrash,
  IconUpload,
  IconShieldCheck,
  IconBuildingCommunity,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { organizationService } from "@/services/organization.service";
import type {
  OrganizationType,
  ProposedMember,
  OrganizationApplication,
} from "@/types/organization";

const organizationTypes: Array<{
  value: OrganizationType;
  label: string;
  description: string;
}> = [
  {
    value: "beekeeper",
    label: "Beekeeper / Apiary Cooperative",
    description: "Manages beehives, apiaries, and harvest batch registrations.",
  },
  {
    value: "processor",
    label: "Processing Facility",
    description: "Handles honey extraction, filtration, packaging, and QA.",
  },
  {
    value: "lab",
    label: "Testing Laboratory",
    description: "Performs chemical, purity, and pollen analysis for certification.",
  },
  {
    value: "distributor",
    label: "Distributor / Logistics",
    description: "Maintains temperature, distribution, and custody records during transit.",
  },
  {
    value: "auditor",
    label: "Standards Auditor",
    description: "Independent verifier reviewing compliance and provenance.",
  },
];

export default function RegisterOrganizationPage() {
  // Form state
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("beekeeper");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  // Primary Contact (Admin)
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Supporting PDF Document
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Proposed Members
  const [proposedMembers, setProposedMembers] = useState<ProposedMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<OrganizationApplication | null>(null);

  // Handle PDF file selection
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF documents are accepted.");
      setSelectedFile(null);
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Document size exceeds maximum limit of 10MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  // Add proposed member
  function handleAddProposedMember() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    setProposedMembers((prev) => [
      ...prev,
      {
        name: newMemberName.trim(),
        email: newMemberEmail.trim().toLowerCase(),
        role: organizationType,
      },
    ]);
    setNewMemberName("");
    setNewMemberEmail("");
    setShowMemberForm(false);
  }

  function handleRemoveProposedMember(index: number) {
    setProposedMembers((prev) => prev.filter((_, i) => i !== index));
  }

  // Submit Application
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (!organizationName.trim()) {
      setSubmitError("Organization name is required.");
      return;
    }
    if (!contactEmail.trim()) {
      setSubmitError("Official contact email is required.");
      return;
    }
    if (!adminName.trim()) {
      setSubmitError("Primary contact name is required.");
      return;
    }
    if (!adminEmail.trim()) {
      setSubmitError("Primary contact email is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit main application
      const result = await organizationService.apply({
        organizationName: organizationName.trim(),
        organizationType,
        registrationNumber: registrationNumber.trim() || undefined,
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        metadata: {
          proposedMembers: proposedMembers.length > 0 ? proposedMembers : undefined,
        },
      });

      const application = result.data;

      // 2. Upload supporting PDF document if attached
      if (selectedFile) {
        try {
          await organizationService.uploadDocument(
            application.applicationId || application._id,
            selectedFile
          );
        } catch (uploadErr) {
          // Log but do not fail the overall application submission
          console.warn("Supporting document upload delayed:", uploadErr);
        }
      }

      setSubmittedApplication(application);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit organization registration. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --------------------------------------------------------------------------
  // Confirmation State
  // --------------------------------------------------------------------------
  if (submittedApplication) {
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
              Verified from hive to jar through decentralized provenance.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-paper/60">
              Each participating stakeholder organization receives an isolated
              multi-tenant workspace and unique blockchain identity upon
              governance approval.
            </p>
          </div>
        </div>

        {/* Confirmation Panel */}
        <div className="flex items-center justify-center bg-paper px-6 py-12 dark:bg-paper-dark">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-verified/15 text-verified">
              <IconCheck size={30} stroke={2} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink-dark">
              Application submitted
            </h1>
            <p className="mt-2 text-base text-ink/70 dark:text-ink-dark/70">
              Your organization is pending HoneyChain approval.
            </p>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/4">
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
                  <span className="text-ink/55 dark:text-ink-dark/55">
                    Reference ID
                  </span>
                  <span className="font-mono font-medium text-honey">
                    {submittedApplication.applicationId}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
                  <span className="text-ink/55 dark:text-ink-dark/55">
                    Organization
                  </span>
                  <span className="font-medium text-ink dark:text-ink-dark">
                    {submittedApplication.organizationName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
                  <span className="text-ink/55 dark:text-ink-dark/55">
                    Organization Type
                  </span>
                  <span className="rounded-md bg-honey/15 px-2.5 py-1 text-xs font-semibold capitalize text-honey">
                    {submittedApplication.organizationType}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
                  <span className="text-ink/55 dark:text-ink-dark/55">
                    Primary Contact
                  </span>
                  <span className="font-medium text-ink dark:text-ink-dark">
                    {submittedApplication.adminName} ({submittedApplication.adminEmail})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink/55 dark:text-ink-dark/55">
                    Official Contact
                  </span>
                  <span className="font-medium text-ink dark:text-ink-dark">
                    {submittedApplication.contactEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Advisory notice */}
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4 text-xs leading-relaxed text-ink/75 dark:text-ink-dark/75">
              <div className="flex items-start gap-2.5">
                <IconShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <strong className="font-semibold text-amber-700 dark:text-amber-300">
                    Important:
                  </strong>{" "}
                  Submitting an application does not create an active HoneyChain
                  account. A HoneyChain Administrator will review your registration
                  details and supporting documentation. Once approved, an activation
                  link will be sent to the primary contact email to complete account
                  setup.
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-honey px-4 text-sm font-medium text-comb transition hover:bg-honey-light"
              >
                Go to Sign in
              </Link>
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:text-ink-dark dark:hover:bg-white/5"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Registration Form State
  // --------------------------------------------------------------------------
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
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
            Register your organization on the decentralized provenance ledger.
          </p>

          <p className="mt-6 text-sm leading-relaxed text-paper/60">
            HoneyChain establishes an unalterable supply chain record.
            Organizations apply for onboarding and receive dedicated stakeholder
            roles and tamper-proof blockchain identities.
          </p>

          <div className="mt-8 space-y-3 rounded-2xl border border-paper/10 bg-paper/5 p-5 text-xs text-paper/80">
            <div className="flex items-center gap-2 font-medium text-honey-light">
              <IconShieldCheck size={16} />
              Onboarding Process
            </div>
            <ol className="list-inside list-decimal space-y-1.5 text-paper/70">
              <li>Submit organization & primary contact details</li>
              <li>Provide optional supporting license/certification PDF</li>
              <li>HoneyChain Administrator review & identity issuance</li>
              <li>Receive activation token to set password and sign in</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12 dark:bg-paper-dark">
        <div className="w-full max-w-xl">
          <div className="mb-6 flex items-center justify-between">
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
              Sign in instead
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink-dark">
              Register your organization
            </h1>
            <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60">
              Submit an application for HoneyChain network approval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Organization Information */}
            <div className="space-y-4 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
                <IconBuildingCommunity size={18} className="text-honey" />
                Organization Details
              </div>

              <div>
                <label
                  htmlFor="orgName"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Organization Name *
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Sundarbans Honey Producers Cooperative"
                  className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="orgType"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Organization Type *
                  </label>
                  <select
                    id="orgType"
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                  >
                    {organizationTypes.map((t) => (
                      <option
                        key={t.value}
                        value={t.value}
                        className="bg-paper text-ink dark:bg-paper-dark dark:text-ink-dark"
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="regNumber"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Registration / License Number
                  </label>
                  <input
                    id="regNumber"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. FSSAI-2026-091 or State Reg"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contactEmail"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Official Email *
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@sundarbans.org"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Phone Number
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98300 12345"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Physical Address
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apiary / Plant / Office physical address"
                  className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                />
              </div>
            </div>

            {/* 2. Primary Contact / Initial Organization Administrator */}
            <div className="space-y-4 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
                  <IconShieldCheck size={18} className="text-honey" />
                  Primary Contact (Organization Administrator)
                </div>
                <p className="mt-1 text-xs text-ink/50 dark:text-ink-dark/50">
                  This person will receive the secure activation token to set up the organization&apos;s admin account upon approval.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="adminName"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Primary Contact Name *
                  </label>
                  <input
                    id="adminName"
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                </div>

                <div>
                  <label
                    htmlFor="adminEmail"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                  >
                    Primary Contact Email *
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="rajesh.admin@sundarbans.org"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                </div>
              </div>
            </div>

            {/* 3. Supporting Documents (Optional PDF) */}
            <div className="space-y-3 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
                <IconFileDescription size={18} className="text-honey" />
                Supporting Documents (Optional)
              </div>
              <p className="text-xs text-ink/50 dark:text-ink-dark/50">
                Upload official accreditation, cooperative registration, or quality compliance documents (PDF format, max 10MB).
              </p>

              {!selectedFile ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 p-6 transition hover:border-honey/60 hover:bg-honey/3 dark:border-white/15 dark:hover:border-honey/60">
                  <IconUpload size={24} className="text-ink/40 dark:text-ink-dark/40" />
                  <span className="mt-2 text-xs font-medium text-ink/70 dark:text-ink-dark/70">
                    Click to select PDF document
                  </span>
                  <span className="mt-1 text-[11px] text-ink/40 dark:text-ink-dark/40">
                    PDF files only, up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-honey/30 bg-honey/5 p-3.5">
                  <div className="flex items-center gap-3">
                    <IconFileDescription size={24} className="text-honey" />
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-ink-dark">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-ink/50 dark:text-ink-dark/50">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="rounded-lg p-1.5 text-ink/50 transition hover:bg-black/5 hover:text-alert dark:text-ink-dark/50 dark:hover:bg-white/5"
                    aria-label="Remove attached document"
                  >
                    <IconTrash size={17} />
                  </button>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-alert">{fileError}</p>
              )}
            </div>

            {/* 4. Optional Proposed Members */}
            <div className="space-y-3 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink dark:text-ink-dark">
                    Proposed Members (Optional)
                  </div>
                  <p className="text-xs text-ink/50 dark:text-ink-dark/50">
                    List team members who will join your organization once approved.
                  </p>
                </div>
                {!showMemberForm && (
                  <button
                    type="button"
                    onClick={() => setShowMemberForm(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:text-ink-dark dark:hover:bg-white/5"
                  >
                    <IconPlus size={14} />
                    Add Member
                  </button>
                )}
              </div>

              {/* Proposed members list */}
              {proposedMembers.length > 0 && (
                <div className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/5 dark:border-white/10">
                  {proposedMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <span className="font-medium text-ink dark:text-ink-dark">
                          {member.name}
                        </span>
                        <span className="ml-2 text-ink/50 dark:text-ink-dark/50">
                          ({member.email})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProposedMember(idx)}
                        className="text-ink/40 transition hover:text-alert dark:text-ink-dark/40"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Member Add Form */}
              {showMemberForm && (
                <div className="space-y-3 rounded-xl border border-honey/20 bg-honey/3 p-3.5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Member Name"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="rounded-lg border border-black/15 bg-transparent px-3 py-1.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                    />
                    <input
                      type="email"
                      placeholder="Member Email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="rounded-lg border border-black/15 bg-transparent px-3 py-1.5 text-xs text-ink outline-none focus:border-honey dark:border-white/15 dark:text-ink-dark"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMemberForm(false)}
                      className="rounded-lg px-2.5 py-1 text-xs text-ink/60 transition hover:bg-black/5 dark:text-ink-dark/60 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddProposedMember}
                      className="rounded-lg bg-honey px-3 py-1 text-xs font-medium text-comb transition hover:bg-honey-light"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {submitError && (
              <p
                role="alert"
                className="rounded-xl bg-alert/10 px-4 py-3 text-sm text-alert"
              >
                {submitError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-xl bg-honey px-4 text-sm font-semibold text-comb transition-colors",
                "hover:bg-honey-light disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {isSubmitting ? "Submitting application…" : "Submit Application"}
            </button>

            <p className="text-center text-xs text-ink/50 dark:text-ink-dark/50">
              By submitting an application, you certify that the information provided is accurate and represents your authorized organization.
            </p>
          </form>
        </div>
      </div>
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
        })
      )}
    </svg>
  );
}
