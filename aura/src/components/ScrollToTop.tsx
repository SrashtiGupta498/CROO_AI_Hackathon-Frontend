import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll position on navigation. Without this the browser keeps the
 * previous page's offset, so following a Footer link lands you at the footer
 * of the new page. Keyed on pathname only — search/hash changes (filters,
 * anchors) must not yank the user back to the top.
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
