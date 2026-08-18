// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The `party` client extension for `SuiClient#$extend()`. The caller builds the
// actual client; package ids are passed in here (never hardcoded / read from env).

import type { ClientWithCoreApi, SuiClientRegistration } from "@mysten/sui/client";
import type { TxThunk } from "./transactions.ts";
import * as queries from "./queries.ts";
import * as transactions from "./transactions.ts";
import * as profileExt from "./extensions/profile.ts";
import * as mediaExt from "./extensions/media.ts";
import * as rolesExt from "./extensions/roles.ts";
import * as tagsExt from "./extensions/tags.ts";
import * as genresExt from "./extensions/genres.ts";
import * as ctasExt from "./extensions/ctas.ts";
import * as linksExt from "./extensions/links.ts";
import * as featuredExt from "./extensions/featured.ts";
import type { Cta, Media, Party, PlatformKey, PlatformLink, Profile } from "./types.ts";
import * as partyMod from "./contracts/miso_party/party.ts";
import * as profileMod from "./contracts/party_profile/party_profile.ts";
import * as mediaMod from "./contracts/party_media/party_media.ts";
import * as rolesMod from "./contracts/party_roles/party_roles.ts";
import * as tagsMod from "./contracts/party_tags/party_tags.ts";
import * as ctaMod from "./contracts/party_cta/party_cta.ts";
import * as genreMod from "./contracts/party_genre/party_genre.ts";
import * as platformLinkMod from "./contracts/party_platform_link/party_platform_link.ts";
import * as socialMod from "./contracts/party_social/party_social.ts";
import * as musicMod from "./contracts/party_music/party_music.ts";
import * as proLinkMod from "./contracts/party_pro_link/party_pro_link.ts";
import * as featuredMod from "./contracts/party_featured_drop/party_featured_drop.ts";

export interface PartyClientOptions<Name extends string = "party"> {
  /** Name for the client extension. Defaults to "party". */
  name?: Name;
  partyPackageId: string;
  partyProfilePackageId: string;
  countryCodePackageId: string;
  languageCodePackageId: string;
  partyMediaPackageId: string;
  partyRolesPackageId: string;
  partyTagsPackageId: string;
  partyGenrePackageId: string;
  partyCtaPackageId: string;
  partyPlatformLinkPackageId: string;
  partySocialPackageId: string;
  partyMusicPackageId: string;
  partyProLinkPackageId: string;
  partyFeaturedDropPackageId: string;
  /** The `genre` vocabulary package (source of `Genre` objects tagged via `party_genre`). */
  genrePackageId: string;
}

/** Defaults `options.package` to `pkg` for every call-function in a generated module. */
function bindModulePackage<M extends object>(mod: M, pkg: string): M {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries({ ...mod })) {
    out[key] =
      typeof value === "function"
        ? (options: { package?: string }) => (value as (o: unknown) => unknown)({ package: pkg, ...options })
        : value;
  }
  return out as M;
}

/**
 * Creates the party client extension.
 *
 * @example
 * ```ts
 * const client = new SuiGrpcClient({ network: "testnet" }).$extend(party({
 *   partyPackageId, partyProfilePackageId, countryCodePackageId, languageCodePackageId,
 * }));
 * const profile = await client.party.getProfile("0x...");
 * ```
 */
export function party<const Name extends string = "party">(
  options: PartyClientOptions<Name>,
): SuiClientRegistration<ClientWithCoreApi, Name, PartyClient> {
  const name = (options.name ?? "party") as Name;
  return { name, register: (client) => new PartyClient(client, options) };
}

export class PartyClient {
  #client: ClientWithCoreApi;
  #pkg: string;
  #profilePkg: string;
  #countryCodePkg: string;
  #languageCodePkg: string;
  #mediaPkg: string;
  #rolesPkg: string;
  #tagsPkg: string;
  #partyGenrePkg: string;
  #ctaPkg: string;
  #platformLinkPkg: string;
  #socialPkg: string;
  #musicPkg: string;
  #proLinkPkg: string;
  #featuredDropPkg: string;
  #genrePkg: string;

  constructor(client: ClientWithCoreApi, o: Omit<PartyClientOptions, "name">) {
    this.#client = client;
    this.#pkg = o.partyPackageId;
    this.#profilePkg = o.partyProfilePackageId;
    this.#countryCodePkg = o.countryCodePackageId;
    this.#languageCodePkg = o.languageCodePackageId;
    this.#mediaPkg = o.partyMediaPackageId;
    this.#rolesPkg = o.partyRolesPackageId;
    this.#tagsPkg = o.partyTagsPackageId;
    this.#partyGenrePkg = o.partyGenrePackageId;
    this.#ctaPkg = o.partyCtaPackageId;
    this.#platformLinkPkg = o.partyPlatformLinkPackageId;
    this.#socialPkg = o.partySocialPackageId;
    this.#musicPkg = o.partyMusicPackageId;
    this.#proLinkPkg = o.partyProLinkPackageId;
    this.#featuredDropPkg = o.partyFeaturedDropPackageId;
    this.#genrePkg = o.genrePackageId;
  }

  /**
   * The `genre` vocabulary package id. Callers resolve `Genre` objects from it to
   * pass to `tx.addGenre` (which takes a genre object id, not this package).
   */
  get genrePackageId(): string {
    return this.#genrePkg;
  }

  // === Queries ===

  async getPartyById(partyId: string): Promise<Party> {
    return queries.getPartyById(this.#client, partyId);
  }
  async getPartiesByIds(
    partyIds: readonly string[],
  ): Promise<Partial<Record<string, Party>>> {
    return queries.getPartiesByIds(this.#client, partyIds);
  }
  derivePartyAdminCapId(partyId: string): string {
    return queries.derivePartyAdminCapId(partyId, this.#pkg);
  }
  async getProfile(partyId: string): Promise<Profile | null> {
    return queries.getProfile(this.#client, partyId, this.#profilePkg);
  }
  async getMedia(partyId: string): Promise<Media | null> {
    return queries.getMedia(this.#client, partyId, this.#mediaPkg);
  }
  /** The party's artist-type roles (display names). */
  async getRoles(partyId: string): Promise<string[]> {
    return queries.getRoles(this.#client, partyId, this.#rolesPkg);
  }
  /** The party's free-form tags. */
  async getTags(partyId: string): Promise<string[]> {
    return queries.getTags(this.#client, partyId, this.#tagsPkg);
  }
  /** The party's genre object ids. */
  async getGenres(partyId: string): Promise<string[]> {
    return queries.getGenres(this.#client, partyId, this.#partyGenrePkg);
  }
  /** The party's ordered CTA list (position is priority). */
  async getCtas(partyId: string): Promise<Cta[]> {
    return queries.getCtas(this.#client, partyId, this.#ctaPkg);
  }
  /** The party's featured drop id (a shared `Drop` object id), or null if unset. */
  async getFeaturedDrop(partyId: string): Promise<string | null> {
    return queries.getFeaturedDrop(this.#client, partyId, this.#featuredDropPkg);
  }
  /** All external-platform links attached to the party (social, music, professional). */
  async getLinks(partyId: string): Promise<PlatformLink[]> {
    return queries.getLinks(this.#client, partyId);
  }
  /** Group ids a party belongs to (member-side membership records). */
  async getMemberships(partyId: string): Promise<string[]> {
    return queries.getMemberships(this.#client, partyId);
  }
  /** Member ids invited to a group but not yet accepted. */
  async getPendingInvites(groupId: string): Promise<string[]> {
    return queries.getPendingInvites(this.#client, groupId);
  }
  /** Group ids that have invited this party but are awaiting its response. */
  async getPendingMemberships(partyId: string): Promise<string[]> {
    return queries.getPendingMemberships(this.#client, partyId);
  }
  /** Whether a party is a member of a group. */
  async isMember(memberId: string, groupId: string): Promise<boolean> {
    return queries.isMember(this.#client, memberId, groupId, this.#pkg);
  }

  // === Transaction builders (thunks; package ids bound from the client) ===

  get tx() {
    const pkg = this.#pkg;
    const profilePkg = this.#profilePkg;
    const cc = this.#countryCodePkg;
    const lc = this.#languageCodePkg;
    const mediaPkg = this.#mediaPkg;
    const rolesPkg = this.#rolesPkg;
    const tagsPkg = this.#tagsPkg;
    const ctaPkg = this.#ctaPkg;
    const partyGenrePkg = this.#partyGenrePkg;
    const featuredPkg = this.#featuredDropPkg;
    const linkIds: linksExt.LinkPackageIds = {
      partyPlatformLinkPackageId: this.#platformLinkPkg,
      partySocialPackageId: this.#socialPkg,
      partyMusicPackageId: this.#musicPkg,
      partyProLinkPackageId: this.#proLinkPkg,
    };
    return {
      createIndividualParty: (p: Omit<transactions.CreatePartyParams, "partyPackageId">): TxThunk =>
        transactions.createIndividualParty({ ...p, partyPackageId: pkg }),
      createGroupParty: (p: Omit<transactions.CreatePartyParams, "partyPackageId">): TxThunk =>
        transactions.createGroupParty({ ...p, partyPackageId: pkg }),
      setName: (p: Omit<transactions.SetNameParams, "partyPackageId">): TxThunk =>
        transactions.setName({ ...p, partyPackageId: pkg }),
      inviteParty: (p: Omit<transactions.InvitePartyParams, "partyPackageId">): TxThunk =>
        transactions.inviteParty({ ...p, partyPackageId: pkg }),
      acceptInvite: (p: Omit<transactions.AcceptInviteParams, "partyPackageId">): TxThunk =>
        transactions.acceptInvite({ ...p, partyPackageId: pkg }),
      declineInvite: (p: Omit<transactions.DeclineInviteParams, "partyPackageId">): TxThunk =>
        transactions.declineInvite({ ...p, partyPackageId: pkg }),
      revokeInvite: (p: Omit<transactions.RevokeInviteParams, "partyPackageId">): TxThunk =>
        transactions.revokeInvite({ ...p, partyPackageId: pkg }),
      leaveGroup: (p: Omit<transactions.LeaveGroupParams, "partyPackageId">): TxThunk =>
        transactions.leaveGroup({ ...p, partyPackageId: pkg }),
      removeMember: (p: Omit<transactions.RemoveMemberParams, "partyPackageId">): TxThunk =>
        transactions.removeMember({ ...p, partyPackageId: pkg }),
      setProfile: (
        p: Omit<profileExt.SetProfileParams, "partyProfilePackageId" | "countryCodePackageId" | "languageCodePackageId">,
      ): TxThunk =>
        profileExt.setProfile({
          ...p,
          partyProfilePackageId: profilePkg,
          countryCodePackageId: cc,
          languageCodePackageId: lc,
        }),
      clearProfile: (p: Omit<profileExt.ClearProfileParams, "partyProfilePackageId">): TxThunk =>
        profileExt.clearProfile({ ...p, partyProfilePackageId: profilePkg }),
      setMedia: (p: Omit<mediaExt.SetMediaParams, "partyMediaPackageId">): TxThunk =>
        mediaExt.setMedia({ ...p, partyMediaPackageId: mediaPkg }),
      clearMedia: (p: Omit<mediaExt.ClearMediaParams, "partyMediaPackageId">): TxThunk =>
        mediaExt.clearMedia({ ...p, partyMediaPackageId: mediaPkg }),
      // Roles
      addRole: (p: Omit<rolesExt.AddRoleParams, "partyRolesPackageId">): TxThunk =>
        rolesExt.addRole({ ...p, partyRolesPackageId: rolesPkg }),
      removeRole: (p: Omit<rolesExt.RemoveRoleParams, "partyRolesPackageId">): TxThunk =>
        rolesExt.removeRole({ ...p, partyRolesPackageId: rolesPkg }),
      clearRoles: (p: Omit<rolesExt.ClearRolesParams, "partyRolesPackageId">): TxThunk =>
        rolesExt.clearRoles({ ...p, partyRolesPackageId: rolesPkg }),
      // Tags
      addTag: (p: Omit<tagsExt.AddTagParams, "partyTagsPackageId">): TxThunk =>
        tagsExt.addTag({ ...p, partyTagsPackageId: tagsPkg }),
      removeTag: (p: Omit<tagsExt.RemoveTagParams, "partyTagsPackageId">): TxThunk =>
        tagsExt.removeTag({ ...p, partyTagsPackageId: tagsPkg }),
      clearTags: (p: Omit<tagsExt.ClearTagsParams, "partyTagsPackageId">): TxThunk =>
        tagsExt.clearTags({ ...p, partyTagsPackageId: tagsPkg }),
      // Genres
      addGenre: (p: Omit<genresExt.AddGenreParams, "partyGenrePackageId">): TxThunk =>
        genresExt.addGenre({ ...p, partyGenrePackageId: partyGenrePkg }),
      removeGenre: (p: Omit<genresExt.RemoveGenreParams, "partyGenrePackageId">): TxThunk =>
        genresExt.removeGenre({ ...p, partyGenrePackageId: partyGenrePkg }),
      clearGenres: (p: Omit<genresExt.ClearGenresParams, "partyGenrePackageId">): TxThunk =>
        genresExt.clearGenres({ ...p, partyGenrePackageId: partyGenrePkg }),
      // CTAs
      setCtas: (p: Omit<ctasExt.SetCtasParams, "partyCtaPackageId">): TxThunk =>
        ctasExt.setCtas({ ...p, partyCtaPackageId: ctaPkg }),
      clearCtas: (p: Omit<ctasExt.ClearCtasParams, "partyCtaPackageId">): TxThunk =>
        ctasExt.clearCtas({ ...p, partyCtaPackageId: ctaPkg }),
      // Featured drop
      setFeaturedDrop: (
        p: Omit<featuredExt.SetFeaturedDropParams, "partyFeaturedDropPackageId">,
      ): TxThunk => featuredExt.setFeaturedDrop({ ...p, partyFeaturedDropPackageId: featuredPkg }),
      clearFeaturedDrop: (
        p: Omit<featuredExt.ClearFeaturedDropParams, "partyFeaturedDropPackageId">,
      ): TxThunk => featuredExt.clearFeaturedDrop({ ...p, partyFeaturedDropPackageId: featuredPkg }),
      // Platform links — generic (any platform) plus per-platform `set…`/`clear…`.
      setLink: (platform: PlatformKey, p: linksExt.BoundSetLinkParams): TxThunk =>
        linksExt.setLink(platform, { ...p, ...linkIds }),
      clearLink: (platform: PlatformKey, p: linksExt.BoundClearLinkParams): TxThunk =>
        linksExt.clearLink(platform, { ...p, ...linkIds }),
      ...linksExt.linkTxBuilders(linkIds),
    };
  }

  // === Generated type-safe Move calls (for tx.add) ===

  get call() {
    return {
      party: bindModulePackage(partyMod, this.#pkg),
      profile: bindModulePackage(profileMod, this.#profilePkg),
      media: bindModulePackage(mediaMod, this.#mediaPkg),
      roles: bindModulePackage(rolesMod, this.#rolesPkg),
      tags: bindModulePackage(tagsMod, this.#tagsPkg),
      cta: bindModulePackage(ctaMod, this.#ctaPkg),
      genre: bindModulePackage(genreMod, this.#partyGenrePkg),
      platformLink: bindModulePackage(platformLinkMod, this.#platformLinkPkg),
      social: bindModulePackage(socialMod, this.#socialPkg),
      music: bindModulePackage(musicMod, this.#musicPkg),
      proLink: bindModulePackage(proLinkMod, this.#proLinkPkg),
      featuredDrop: bindModulePackage(featuredMod, this.#featuredDropPkg),
    };
  }

  // === Generated BCS structs (for parsing object/event content) ===

  get bcs() {
    return {
      Party: partyMod.Party,
      PartyAdminCap: partyMod.PartyAdminCap,
      Profile: profileMod.Profile,
      ProfileSetEvent: profileMod.ProfileSetEvent,
      Media: mediaMod.Media,
      MediaSetEvent: mediaMod.MediaSetEvent,
      ArtistRole: rolesMod.ArtistRole,
      PartyRoles: rolesMod.PartyRoles,
      RoleAddedEvent: rolesMod.RoleAddedEvent,
      PartyTags: tagsMod.PartyTags,
      TagAddedEvent: tagsMod.TagAddedEvent,
      Cta: ctaMod.Cta,
      CtasSetEvent: ctaMod.CtasSetEvent,
      PartyGenres: genreMod.PartyGenres,
      GenreAddedEvent: genreMod.GenreAddedEvent,
      LinkSetEvent: platformLinkMod.LinkSetEvent,
      LinkClearedEvent: platformLinkMod.LinkClearedEvent,
      FeaturedSetEvent: featuredMod.FeaturedSetEvent,
      FeaturedClearedEvent: featuredMod.FeaturedClearedEvent,
    };
  }
}
