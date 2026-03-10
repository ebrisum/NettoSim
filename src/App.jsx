import { useState, useEffect } from "react";
import { C, F, FURL } from "./constants/theme.js";
import { loadUser, loadSavedScenario, saveSavedScenario } from "./lib/userStorage.js";
import { supabase } from "../lib/supabase/client";
import Landing from "./pages/Landing.jsx";
import SimPage from "./pages/SimPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import PartnersPage from "./pages/PartnersPage.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
export default function App() {
  const [page, setPage] = useState("home");
  const [contactSubject, setContactSubject] = useState("");
  const [contactPartnerSlug, setContactPartnerSlug] = useState("");
  const [user, setUser] = useState(() => loadUser());
  const goContact = (subject = "", options = {}) => {
    setContactSubject(subject);
    setContactPartnerSlug(options.partnerSlug || "");
    setPage("contact");
  };

  const saveScenario = (data) => {
    if (!user) return;
    saveSavedScenario(user.id, data);
    const isSupabaseUser = user.provider === "supabase" || !!user.supabaseUserId;
    if (!isSupabaseUser) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const token = session?.access_token;
      if (!token) return;
      await fetch("/api/v1/user/scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: "Simulator scenario",
          current: data?.cur || {},
          proposed: data?.nw || {},
        }),
      }).catch(() => {});
    });
  };
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <>
      <link href={FURL} rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{overflow-x:hidden}button,select{font-family:${F}}::selection{background:${C.primary}25}textarea{font-family:${F}}input:focus,select:focus{border-color:${C.primary}!important}`}</style>
      {page === "home" && <Landing setPage={setPage} goContact={goContact} user={user} />}
      {page === "app" && (
        <SimPage
          setPage={setPage}
          goContact={goContact}
          user={user}
          onSaveScenario={user ? saveScenario : null}
          loadSavedScenario={user ? (() => loadSavedScenario(user.id)) : null}
        />
      )}
      {page === "about" && <AboutPage setPage={setPage} goContact={goContact} user={user} />}
      {page === "partners" && <PartnersPage setPage={setPage} goContact={goContact} user={user} />}
      {page === "faq" && <FaqPage setPage={setPage} goContact={goContact} user={user} />}
      {page === "contact" && (
        <ContactPage
          setPage={setPage}
          goContact={goContact}
          initialSubject={contactSubject}
          initialPartnerSlug={contactPartnerSlug}
          user={user}
        />
      )}
      {page === "login" && <LoginPage setPage={setPage} setUser={setUser} />}
      {page === "profile" && user && <ProfilePage setPage={setPage} goContact={goContact} user={user} setUser={setUser} />}
    </>
  );
}
