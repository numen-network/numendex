import {
  useCallback,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "numendex-theme";

function getInitialTheme() {
  const savedTheme =
    localStorage.getItem(STORAGE_KEY);

  if (
    savedTheme === "light" ||
    savedTheme === "dark"
  ) {
    return savedTheme;
  }

  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
  ) {
    return "dark";
  }

  return "light";
}

export default function useTheme() {
  const [theme, setTheme] =
    useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      STORAGE_KEY,
      theme
    );
  }, [theme]);

  const toggleTheme =
    useCallback(() => {
      setTheme((currentTheme) =>
        currentTheme === "light"
          ? "dark"
          : "light"
      );
    }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}