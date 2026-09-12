export interface OrganizationDetails {
  name: string;
  role?: string;
  roleLabel?: string;
  walletAddress?: string;
}

export const KNOWN_ORGANIZATIONS: Record<string, OrganizationDetails> = {
  "0x111748e2d54d3f151746af8b508ce8ad626d7a93": {
    name: "Sundarbans Apiary Cooperative",
    role: "beekeeper",
    roleLabel: "Beekeeper / Producer",
    walletAddress: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
  },
  "0x88bce6325a09fb4943d61a48ea5282ebeeb7744c": {
    name: "National Honey Quality Testing Laboratory",
    role: "lab",
    roleLabel: "Certified Laboratory",
    walletAddress: "0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c",
  },
  "0x8d34e7768603473001aedc1b5ed82c05cbaf6c34": {
    name: "Bengal Organic Honey Processing Ltd",
    role: "processor",
    roleLabel: "Processor / Packaging",
    walletAddress: "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34",
  },
  "0x3003d5104621e8dd31c8c70dffaa59816400d2d9": {
    name: "SafeHive Cold Chain Logistics",
    role: "distributor",
    roleLabel: "Distributor / Logistics",
    walletAddress: "0x3003D5104621e8DD31c8c70DFFAa59816400D2D9",
  },
  "0x09c1d432f79fb1dad516bf688930aab81aa0978a": {
    name: "FSSAI Quality & Compliance Bureau",
    role: "auditor",
    roleLabel: "Regulatory Auditor",
    walletAddress: "0x09c1d432f79fb1dad516bf688930aab81aa0978a",
  },
  "0x0f196ced7e9fd60c64fd7c1e03909b821edacf08": {
    name: "HoneyChain Administrative Authority",
    role: "admin",
    roleLabel: "System Administrator",
    walletAddress: "0x0f196ced7e9fd60c64fd7c1e03909b821edacf08",
  },
};

export function getOrganizationForAddress(
  address?: string | null,
  dynamicOrgs?: Record<string, any>
): OrganizationDetails | null {
  if (!address) return null;
  const key = address.trim().toLowerCase();

  if (dynamicOrgs && dynamicOrgs[key]) {
    const d = dynamicOrgs[key];
    return {
      name: d.name,
      role: d.role,
      roleLabel:
        d.roleLabel ||
        (d.role ? d.role.charAt(0).toUpperCase() + d.role.slice(1) : undefined),
      walletAddress: d.walletAddress || address,
    };
  }

  if (KNOWN_ORGANIZATIONS[key]) {
    return KNOWN_ORGANIZATIONS[key];
  }

  return null;
}

export function formatAddressOrOrg(
  addressOrName?: string | null,
  dynamicOrgs?: Record<string, any>
): {
  displayName: string;
  address?: string;
  roleLabel?: string;
  isAddress: boolean;
} {
  if (!addressOrName) {
    return { displayName: "—", isAddress: false };
  }

  const isAddr =
    addressOrName.startsWith("0x") && addressOrName.length >= 30;

  if (!isAddr) {
    // If it's already a human readable name (e.g. "Authorized Beekeeper")
    return { displayName: addressOrName, isAddress: false };
  }

  const org = getOrganizationForAddress(addressOrName, dynamicOrgs);
  if (org) {
    return {
      displayName: org.name,
      address: addressOrName,
      roleLabel: org.roleLabel,
      isAddress: true,
    };
  }

  return {
    displayName: addressOrName,
    address: addressOrName,
    isAddress: true,
  };
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
