import { useState, useEffect, useCallback } from "react";
import { RouterContext, useRouter } from "./useRouter.js";

function parseHash(hash) {
  const clean = hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = clean.split("?");

  const segments = pathPart ? pathPart.split("/") : [];
  const searchParams = new URLSearchParams(queryPart || "");
  const query = Object.fromEntries(searchParams.entries());

  return {
    rawPath: "/" + (pathPart || ""),
    segments,
    query,
  };
}

export function RouterProvider({ children }) {
  const [routeInfo, setRouteInfo] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRouteInfo(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((to) => {
    let target = to;
    if (target.startsWith("#")) {
      target = target.substring(1);
    }
    if (!target.startsWith("/")) {
      target = "/" + target;
    }
    window.location.hash = target;
  }, []);

  const value = {
    path: routeInfo.rawPath,
    segments: routeInfo.segments,
    query: routeInfo.query,
    navigate,
  };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function Link({ to, children, className = "", style = {}, ...props }) {
  const { navigate } = useRouter();

  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };

  let href = to;
  if (!href.startsWith("#")) {
    href = "#" + (href.startsWith("/") ? href : "/" + href);
  }

  return (
    <a href={href} onClick={handleClick} className={className} style={style} {...props}>
      {children}
    </a>
  );
}
