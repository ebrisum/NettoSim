"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { loadUser, loadSavedScenario, saveSavedScenario } from "@/lib/userStorage";
import { supabase } from "lib/supabase/client";
import Landing from "@/pages/Landing";
import SimPage from "@/pages/SimPage";
import AboutPage from "@/pages/AboutPage";
import PartnersPage from "@/pages/PartnersPage";
import FaqPage from "@/pages/FaqPage";
import ContactPage from "@/pages/ContactPage";
import LoginPage from "@/pages/LoginPage";
import ProfilePage from "@/pages/ProfilePage";
import { C, F } from "@/constants/theme";

const pathToPage: Record<string, string> = {
  "/": "home",
  "/home": "home",
  "/sim": "app",
  "/about": "about",
  "/partners": "partners",
  "/faq": "faq",
  "/contact": "contact",
  "/login": "login",
  "/profile": "profile",
};

const pageToPath: Record<string, string> = {
  home: "/",
  app: "/sim",
  about: "/about",
  partners: "/partners",
  faq: "/faq",
  contact: "/contact",
  login: "/login",
  profile: "/profile",
};

export default function ClientApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    provider?: string;
    supabaseUserId?: string;
  } | null>(() => loadUser());
  const [contactSubject, setContactSubject] = useState("");
  const [contactPartnerSlug, setContactPartnerSlug] = useState("");

  const page = pathToPage[pathname ?? "/"] ?? "home";

  const setPage = useCallback(
    (p: string) => {
      const path = pageToPath[p] ?? "/";
      if (path !== pathname) router.push(path);
    },
    [pathname, router]
  );

  const goContact = useCallback(
    (subject = "", options: { partnerSlug?: string } = {}) => {
      setContactSubject(subject);
      setContactPartnerSlug(options.partnerSlug || "");
      setPage("contact");
    },
    [setPage]
  );

  const saveScenario = useCallback(
    (scenarioData: unknown) => {
      if (!user) return;
      saveSavedScenario(user.id, scenarioData);
      const isSupabaseUser = user.provider === "supabase" || !!user.supabaseUserId;
      if (!isSupabaseUser) return;

      void supabase.auth.getSession().then(async ({ data: { session } }) => {
        const token = session?.access_token;
        if (!token) return;
        const payload = (scenarioData || {}) as { cur?: unknown; nw?: unknown };
        await fetch("/api/v1/user/scenarios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: "Simulator scenario",
            current: payload.cur || {},
            proposed: payload.nw || {},
          }),
        }).catch(() => {});
      });
    },
    [user]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{overflow-x:hidden}button,select{font-family:${F}}::selection{background:${C.primary}25}textarea{font-family:${F}}input:focus,select:focus{border-color:${C.primary}!important}`}</style>
      {page === "home" && (
        <Landing setPage={setPage} goContact={goContact} user={user} />
      )}
      {page === "app" && (
        <SimPage
          setPage={setPage}
          goContact={goContact}
          user={user}
          onSaveScenario={user ? saveScenario : null}
          loadSavedScenario={user ? () => loadSavedScenario(user.id) : null}
        />
      )}
      {page === "about" && (
        <AboutPage setPage={setPage} goContact={goContact} user={user} />
      )}
      {page === "partners" && (
        <PartnersPage setPage={setPage} goContact={goContact} user={user} />
      )}
      {page === "faq" && (
        <FaqPage setPage={setPage} goContact={goContact} user={user} />
      )}
      {page === "contact" && (
        <ContactPage
          setPage={setPage}
          goContact={goContact}
          initialSubject={contactSubject}
          initialPartnerSlug={contactPartnerSlug}
          user={user}
        />
      )}
      {page === "login" && (
        <LoginPage setPage={setPage} setUser={setUser} />
      )}
      {page === "profile" && user && (
        <ProfilePage
          setPage={setPage}
          goContact={goContact}
          user={user}
          setUser={setUser}
        />
      )}
    </>
  );
}
