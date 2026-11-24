import { createContext } from "react";

/** Lets any page's top row fold the sidebar (wide screens) or open the drawer (narrow ones). */
export const ShellContext = createContext({ toggleNav: () => {} });
