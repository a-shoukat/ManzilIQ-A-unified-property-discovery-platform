import { describe, expect, it } from "vitest";
import {
  BUILTIN_RESIDENCE_PATH,
  defaultHomepageView,
  homepageTitleLines,
  homepageViewMatchesHardcoded,
  resolveHomepageView,
} from "@/lib/manzil/homepage-cms";
import { HARDCODED_HOMEPAGE_CONTENT } from "@/lib/manzil/homepage-cms";

describe("homepage CMS resolve", () => {
  it("empty DB gives identical output as hardcoded defaults", () => {
    const view = resolveHomepageView({ contentRows: [], banners: [] });
    expect(homepageViewMatchesHardcoded(view)).toBe(true);
    expect(view.content).toEqual(HARDCODED_HOMEPAGE_CONTENT);
    expect(view.banners).toHaveLength(1);
    expect(view.banners[0]!.image_path).toBe(BUILTIN_RESIDENCE_PATH);
    expect(view.banners[0]!.title).toBe(defaultHomepageView().banners[0]!.title);
  });

  it("error / missing tables falls back to hardcoded", () => {
    expect(homepageViewMatchesHardcoded(resolveHomepageView({ error: true }))).toBe(true);
  });

  it("edited banner changes only that banner", () => {
    const base = resolveHomepageView({ contentRows: [], banners: [] });
    const edited = resolveHomepageView({
      contentRows: [],
      banners: [
        {
          id: "b1",
          title: "Edited banner only",
          subtitle: "Still one banner",
          image_path: "custom/path.jpg",
          href: "/map-view",
          sort_order: 0,
          active: true,
          created_at: "",
          updated_at: "",
        },
      ],
    });
    expect(edited.banners).toHaveLength(1);
    expect(edited.banners[0]!.title).toBe("Edited banner only");
    expect(edited.banners[0]!.image_path).toBe("custom/path.jpg");
    // Content (heading) unchanged vs defaults
    expect(edited.content).toEqual(base.content);
    expect(edited.content["marketplace_title"]).toBe(
      HARDCODED_HOMEPAGE_CONTENT["marketplace_title"],
    );
  });

  it("inactive banners are ignored and fall back to default", () => {
    const view = resolveHomepageView({
      banners: [
        {
          id: "off",
          title: "Hidden",
          subtitle: null,
          image_path: null,
          href: null,
          sort_order: 0,
          active: false,
          created_at: "",
          updated_at: "",
        },
      ],
    });
    expect(homepageViewMatchesHardcoded(view)).toBe(true);
  });

  it("splits hero title on newlines like the hardcoded <br/>", () => {
    expect(homepageTitleLines("A new address.\nA new beginning.")).toEqual([
      "A new address.",
      "A new beginning.",
    ]);
  });
});
